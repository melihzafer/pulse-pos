import { db } from '../database/dexieDb';
import type { StockTransfer, StockTransferItem, StockTransferStatus } from '../types';

export class StockTransferService {
  /**
   * Generate next transfer number (TRF-001, TRF-002, etc.)
   */
  static async generateTransferNumber(workspaceId: string): Promise<string> {
    const lastTransfer = await db.stock_transfers
      .where('workspace_id')
      .equals(workspaceId)
      .reverse()
      .first();

    if (!lastTransfer) {
      return 'TRF-001';
    }

    const lastNumber = parseInt(lastTransfer.transfer_number.split('-')[1]);
    return `TRF-${String(lastNumber + 1).padStart(3, '0')}`;
  }

  /**
   * Create a new stock transfer request
   */
  static async createTransfer(
    workspaceId: string,
    fromLocationId: string,
    toLocationId: string,
    requestedByUserId: string,
    items: Array<{ product_id: string; product_name: string; quantity_requested: number; notes?: string }>,
    notes?: string
  ): Promise<string> {
    const transferNumber = await this.generateTransferNumber(workspaceId);
    const transferId = crypto.randomUUID();

    const transfer: StockTransfer = {
      id: transferId,
      workspace_id: workspaceId,
      transfer_number: transferNumber,
      from_location_id: fromLocationId,
      to_location_id: toLocationId,
      status: 'requested',
      requested_by_user_id: requestedByUserId,
      requested_date: new Date().toISOString(),
      notes,
      created_at: new Date().toISOString(),
    };

    await db.stock_transfers.add({
      ...transfer,
      _synced: false,
      _dirty: true,
    });

    // Add transfer items
    for (const item of items) {
      const transferItem: StockTransferItem = {
        id: crypto.randomUUID(),
        transfer_id: transferId,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity_requested: item.quantity_requested,
        quantity_approved: 0,
        quantity_received: 0,
        notes: item.notes,
      };

      await db.stock_transfer_items.add({
        ...transferItem,
        _synced: false,
        _dirty: true,
      });
    }

    return transferId;
  }

  /**
   * Approve a transfer request
   */
  static async approveTransfer(
    transferId: string,
    approvedByUserId: string,
    itemApprovals: Array<{ item_id: string; quantity_approved: number }>
  ): Promise<void> {
    await db.stock_transfers.update(transferId, {
      status: 'approved',
      approved_by_user_id: approvedByUserId,
      approved_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _dirty: true,
    });

    // Update item quantities
    for (const approval of itemApprovals) {
      await db.stock_transfer_items.update(approval.item_id, {
        quantity_approved: approval.quantity_approved,
        _dirty: true,
      });
    }
  }

  /**
   * Reject/Cancel a transfer
   */
  static async cancelTransfer(transferId: string): Promise<void> {
    await db.stock_transfers.update(transferId, {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
      _dirty: true,
    });
  }

  /**
   * Mark transfer as shipped (from location)
   */
  static async shipTransfer(transferId: string): Promise<void> {
    const transfer = await db.stock_transfers.get(transferId);
    if (!transfer) throw new Error('Transfer not found');

    const items = await db.stock_transfer_items
      .where('transfer_id')
      .equals(transferId)
      .toArray();

    // Create negative stock movements at from_location
    for (const item of items) {
      await db.stock_movements.add({
        id: crypto.randomUUID(),
        workspace_id: transfer.workspace_id,
        location_id: transfer.from_location_id,
        product_id: item.product_id,
        quantity_change: -item.quantity_approved,
        reason: 'correction',
        reference_id: transferId,
        created_at: new Date().toISOString(),
        _synced: false,
      });

      // Update product stock at from_location
      const product = await db.products
        .where('[id+location_id]')
        .equals([item.product_id, transfer.from_location_id])
        .first();

      if (product) {
        await db.products.update(product.id, {
          stock_quantity: product.stock_quantity - item.quantity_approved,
          _dirty: true,
        });
      }
    }

    await db.stock_transfers.update(transferId, {
      status: 'shipped',
      shipped_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _dirty: true,
    });
  }

  /**
   * Receive transfer (at to location)
   */
  static async receiveTransfer(
    transferId: string,
    itemReceipts: Array<{ item_id: string; quantity_received: number }>
  ): Promise<void> {
    const transfer = await db.stock_transfers.get(transferId);
    if (!transfer) throw new Error('Transfer not found');

    // Update received quantities
    for (const receipt of itemReceipts) {
      await db.stock_transfer_items.update(receipt.item_id, {
        quantity_received: receipt.quantity_received,
        _dirty: true,
      });

      const item = await db.stock_transfer_items.get(receipt.item_id);
      if (!item) continue;

      // Create positive stock movement at to_location
      await db.stock_movements.add({
        id: crypto.randomUUID(),
        workspace_id: transfer.workspace_id,
        location_id: transfer.to_location_id,
        product_id: item.product_id,
        quantity_change: receipt.quantity_received,
        reason: 'restock',
        reference_id: transferId,
        created_at: new Date().toISOString(),
        _synced: false,
      });

      // Update product stock at to_location
      const product = await db.products
        .where('[id+location_id]')
        .equals([item.product_id, transfer.to_location_id])
        .first();

      if (product) {
        await db.products.update(product.id, {
          stock_quantity: product.stock_quantity + receipt.quantity_received,
          _dirty: true,
        });
      }
    }

    await db.stock_transfers.update(transferId, {
      status: 'received',
      received_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      _dirty: true,
    });
  }

  /**
   * Get all transfers for a workspace
   */
  static async getTransfers(
    workspaceId: string,
    status?: StockTransferStatus
  ): Promise<Array<StockTransfer & { items: StockTransferItem[] }>> {
    let query = db.stock_transfers.where('workspace_id').equals(workspaceId);

    if (status) {
      query = query.and(t => t.status === status);
    }

    const transfers = await query.reverse().sortBy('requested_date');

    // Attach items to each transfer
    const transfersWithItems = await Promise.all(
      transfers.map(async (transfer) => {
        const items = await db.stock_transfer_items
          .where('transfer_id')
          .equals(transfer.id)
          .toArray();

        return {
          ...transfer,
          items,
        };
      })
    );

    return transfersWithItems;
  }

  /**
   * Get a single transfer with items
   */
  static async getTransferById(
    transferId: string
  ): Promise<(StockTransfer & { items: StockTransferItem[] }) | undefined> {
    const transfer = await db.stock_transfers.get(transferId);
    if (!transfer) return undefined;

    const items = await db.stock_transfer_items
      .where('transfer_id')
      .equals(transferId)
      .toArray();

    return {
      ...transfer,
      items,
    };
  }

  /**
   * Get pending transfers (requested or approved) for a location
   */
  static async getPendingTransfersForLocation(
    locationId: string,
    direction: 'from' | 'to'
  ): Promise<Array<StockTransfer & { items: StockTransferItem[] }>> {
    const field = direction === 'from' ? 'from_location_id' : 'to_location_id';
    
    const transfers = await db.stock_transfers
      .where(field)
      .equals(locationId)
      .and(t => ['requested', 'approved', 'shipped'].includes(t.status))
      .reverse()
      .sortBy('requested_date');

    const transfersWithItems = await Promise.all(
      transfers.map(async (transfer) => {
        const items = await db.stock_transfer_items
          .where('transfer_id')
          .equals(transfer.id)
          .toArray();

        return {
          ...transfer,
          items,
        };
      })
    );

    return transfersWithItems;
  }
}
