import { db } from '../database';
import { supabase } from '../database/supabaseClient';
import { Sale, StockMovement } from '../types';

class SyncService {
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupNetworkListeners();
  }

  /**
   * Setup online/offline event listeners
   */
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('Network: Online');
      this.isOnline = true;
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      console.log('Network: Offline');
      this.isOnline = false;
    });
  }

  /**
   * Start automatic sync with interval
   */
  startAutoSync(intervalSeconds: number = 300) {
    this.stopAutoSync();
    
    console.log(`Starting auto-sync every ${intervalSeconds} seconds`);
    this.syncInterval = setInterval(() => {
      this.syncAll();
    }, intervalSeconds * 1000);

    // Initial sync
    this.syncAll();
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sync all pending changes to Supabase
   */
  async syncAll(): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    console.log('Starting sync...');

    try {
      // 1. Pull updates from Supabase (delta sync)
      await this.pullUpdates();

      // 2. Push local changes to Supabase
      await this.pushChanges();

      console.log('Sync completed successfully');
      window.dispatchEvent(new CustomEvent('sync-success'));
    } catch (error) {
      console.error('Sync failed:', error);
      window.dispatchEvent(new CustomEvent('sync-error', { detail: error }));
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Pull updates from Supabase (products only for now)
   */
  private async pullUpdates(): Promise<void> {
    try {
      // Get last sync timestamp
      const lastSync = await db.sync_metadata.get({ key: 'last_sync_timestamp' });
      const timestamp = lastSync?.value || new Date(0).toISOString();

      console.log('Pulling updates since:', timestamp);

      // Fetch products updated since last sync
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .gt('updated_at', timestamp)
        .order('updated_at', { ascending: true });

      if (error) throw error;

      if (products && products.length > 0) {
        console.log(`Received ${products.length} product updates`);

        // Upsert products to local DB
        for (const product of products) {
          await db.products.put(product);
        }

        // Update last sync timestamp
        const latestTimestamp = products[products.length - 1].updated_at;
        await db.sync_metadata.put({
          key: 'last_sync_timestamp',
          value: latestTimestamp,
          updated_at: new Date(),
        });
      }
    } catch (error) {
      console.error('Pull updates failed:', error);
      throw error;
    }
  }

  /**
   * Push local changes to Supabase
   */
  private async pushChanges(): Promise<void> {
    try {
      // Get unsynced sales
      const unsyncedSales = await db.sales
        .where('synced_at')
        .equals('')
        .toArray();

      console.log(`Pushing ${unsyncedSales.length} unsynced sales`);

      for (const sale of unsyncedSales) {
        await this.pushSale(sale);
      }

      // Get unsynced stock movements
      const unsyncedMovements = await db.stock_movements
        .where('synced_at')
        .equals('')
        .toArray();

      console.log(`Pushing ${unsyncedMovements.length} unsynced stock movements`);

      for (const movement of unsyncedMovements) {
        await this.pushStockMovement(movement);
      }
    } catch (error) {
      console.error('Push changes failed:', error);
      throw error;
    }
  }

  /**
   * Push a single sale to Supabase
   */
  private async pushSale(sale: Sale): Promise<void> {
    try {
      // Insert sale
      const { error: saleError } = await supabase
        .from('sales')
        .insert({
          id: sale.id,
          workspace_id: sale.workspace_id,
          user_id: sale.user_id,
          total_amount: sale.total_amount,
          payment_method: sale.payment_method,
          status: sale.status,
          created_at: sale.created_at,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Insert sale items
      if (sale.items && sale.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(
            sale.items.map((item) => ({
              id: item.id,
              sale_id: sale.id,
              product_id: item.product_id,
              product_name_snapshot: item.product_name_snapshot,
              cost_snapshot: item.cost_snapshot,
              price_snapshot: item.price_snapshot,
              quantity: item.quantity,
            }))
          );

        if (itemsError) throw itemsError;
      }

      // Mark as synced locally
      await db.sales.update(sale.id, {
        synced_at: new Date().toISOString(),
      });

      console.log(`Sale ${sale.id} synced successfully`);
    } catch (error) {
      console.error(`Failed to sync sale ${sale.id}:`, error);
      throw error;
    }
  }

  /**
   * Push a single stock movement to Supabase
   */
  private async pushStockMovement(movement: StockMovement): Promise<void> {
    try {
      const { error } = await supabase.from('stock_movements').insert({
        id: movement.id,
        workspace_id: movement.workspace_id,
        product_id: movement.product_id,
        quantity_change: movement.quantity_change,
        reason: movement.reason,
        reference_id: movement.reference_id,
        created_at: movement.created_at,
      });

      if (error) throw error;

      // Mark as synced locally
      await db.stock_movements.update(movement.id, {
        synced_at: new Date().toISOString(),
      });

      console.log(`Stock movement ${movement.id} synced successfully`);
    } catch (error) {
      console.error(`Failed to sync stock movement ${movement.id}:`, error);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    isSyncing: boolean;
    pendingSales: number;
    pendingMovements: number;
    lastSync: string | null;
  }> {
    const unsyncedSales = await db.sales
      .where('synced_at')
      .equals('')
      .count();

    const unsyncedMovements = await db.stock_movements
      .where('synced_at')
      .equals('')
      .count();

    const lastSync = await db.sync_metadata.get({ key: 'last_sync_timestamp' });

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingSales: unsyncedSales,
      pendingMovements: unsyncedMovements,
      lastSync: lastSync?.value || null,
    };
  }
}

// Export singleton instance
export const syncService = new SyncService();
