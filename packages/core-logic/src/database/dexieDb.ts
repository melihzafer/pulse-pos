import Dexie, { Table } from 'dexie';
import type { 
  Product, Sale, SaleItem, StockMovement, Workspace, ParkedSale, Shift, CashTransaction, 
  Customer, ProductBarcode, Promotion, Supplier, ProductSupplier, PurchaseOrder, PurchaseOrderItem,
  GiftCard, CreditTransaction, LayawayOrder, LayawayOrderItem, LayawayPayment,
  Location, StockTransfer, StockTransferItem, LocationPricing
} from '../types';

// Extended types for local storage with sync metadata
export interface LocalProduct extends Product {
  _synced?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
}

export interface LocalProductBarcode extends ProductBarcode {
  _synced?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
}

export interface LocalPromotion extends Promotion {
  _synced?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
}

export interface LocalSale extends Sale {
  _synced?: boolean;
  _dirty?: boolean;
  fiscal_receipt_number?: string;
  fiscal_receipt_generated_at?: string;
  tax_amount?: number;
  subtotal_before_tax?: number;
}

export interface LocalSaleItem extends SaleItem {
  _synced?: boolean;
}

export interface LocalStockMovement extends StockMovement {
  _synced?: boolean;
}

export interface LocalWorkspace extends Workspace {
  _synced?: boolean;
}

export interface LocalShift extends Shift {
  _synced?: boolean;
  _dirty?: boolean;
}

export interface LocalCashTransaction extends CashTransaction {
  _synced?: boolean;
}

export interface LocalCustomer extends Customer {
  _synced?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
}

export interface PayItForwardItem {
  id: string;
  product_id: string;
  product_name: string;
  price: number;
  status: 'available' | 'redeemed';
  created_at: string;
  redeemed_at?: string;
  customer_id?: string;
  note?: string;
  _synced?: boolean;
  _dirty?: boolean;
}

export interface Cashier {
  id: string;
  workspace_id: string;
  username: string;
  pin_code: string; // 4-6 digit PIN
  full_name: string;
  is_active: boolean;
  role: 'admin' | 'manager' | 'cashier';
  created_at: string;
  _synced?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
}

export interface LocalSupplier extends Supplier {
  _synced?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
}

export interface LocalProductSupplier extends ProductSupplier {
  _synced?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
}

export interface LocalPurchaseOrder extends PurchaseOrder {
  _synced?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
}

export interface LocalPurchaseOrderItem extends PurchaseOrderItem {
  _synced?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
}

export interface LocalGiftCard extends GiftCard {
  _synced?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
}

export interface LocalCreditTransaction extends CreditTransaction {
  _synced?: boolean;
}

export interface LocalLayawayOrder extends LayawayOrder {
  _synced?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
}

export interface LocalLayawayOrderItem extends LayawayOrderItem {
  _synced?: boolean;
}

export interface LocalLayawayPayment extends LayawayPayment {
  _synced?: boolean;
}

export interface LocalLocation extends Location {
  _synced?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
}

export interface LocalStockTransfer extends StockTransfer {
  _synced?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
}

export interface LocalStockTransferItem extends StockTransferItem {
  _synced?: boolean;
  _dirty?: boolean;
}

export interface LocalLocationPricing extends LocationPricing {
  _synced?: boolean;
  _dirty?: boolean;
  _deleted?: boolean;
}

export interface SyncMetadata {
  id?: number;
  key: string; // e.g., 'products_last_sync', 'sales_last_sync'
  value: string; // ISO timestamp or other value
  updated_at: Date;
}

export class PulseDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  sales!: Table<LocalSale, string>;
  sale_items!: Table<LocalSaleItem, string>;
  stock_movements!: Table<LocalStockMovement, string>;
  workspaces!: Table<LocalWorkspace, string>;
  sync_metadata!: Table<SyncMetadata, number>;
  parked_sales!: Table<ParkedSale, string>;
  shifts!: Table<LocalShift, string>;
  cash_transactions!: Table<LocalCashTransaction, string>;
  customers!: Table<LocalCustomer, string>;
  pay_it_forward!: Table<PayItForwardItem, string>;
  product_barcodes!: Table<LocalProductBarcode, string>;
  promotions!: Table<LocalPromotion, string>;
  cashiers!: Table<Cashier, string>;
  suppliers!: Table<LocalSupplier, string>;
  product_suppliers!: Table<LocalProductSupplier, string>;
  purchase_orders!: Table<LocalPurchaseOrder, string>;
  purchase_order_items!: Table<LocalPurchaseOrderItem, string>;
  gift_cards!: Table<LocalGiftCard, string>;
  credit_transactions!: Table<LocalCreditTransaction, string>;
  layaway_orders!: Table<LocalLayawayOrder, string>;
  layaway_order_items!: Table<LocalLayawayOrderItem, string>;
  layaway_payments!: Table<LocalLayawayPayment, string>;
  locations!: Table<LocalLocation, string>;
  stock_transfers!: Table<LocalStockTransfer, string>;
  stock_transfer_items!: Table<LocalStockTransferItem, string>;
  location_pricing!: Table<LocalLocationPricing, string>;

  constructor() {
    super('PulseDB');
    
    this.version(1).stores({
      products: 'id, workspace_id, barcode, name, *_synced, *_dirty, updated_at',
      sales: 'id, workspace_id, user_id, created_at, *_synced, *_dirty',
      sale_items: 'id, sale_id, product_id, *_synced',
      stock_movements: 'id, workspace_id, product_id, created_at, *_synced',
      workspaces: 'id, name, *_synced',
      sync_metadata: '++id, &key, updated_at',
    });

    this.version(2).stores({
      products: 'id, workspace_id, barcode, name, is_quick_key, *_synced, *_dirty, updated_at',
      parked_sales: 'id, parked_at'
    });

    this.version(3).stores({
      shifts: 'id, workspace_id, user_id, status, start_time, *_synced, *_dirty',
      cash_transactions: 'id, shift_id, type, created_at, *_synced'
    });

    this.version(4).stores({
      customers: 'id, workspace_id, phone, email, name, *_synced, *_dirty, updated_at',
      sales: 'id, workspace_id, user_id, customer_id, created_at, *_synced, *_dirty' // Updated to index customer_id
    });

    this.version(5).stores({
      pay_it_forward: 'id, product_id, status, created_at, *_synced, *_dirty'
    });

    this.version(6).stores({
      product_barcodes: 'id, product_id, barcode, *_synced, *_dirty',
      promotions: 'id, workspace_id, type, is_active, *_synced, *_dirty'
    });

    this.version(7).stores({
      cashiers: 'id, workspace_id, username, is_active, role, *_synced, *_dirty, *_deleted'
    });

    this.version(8).stores({
      customers: 'id, workspace_id, phone, email, name, tier, referral_code, *_synced, *_dirty, updated_at'
    }).upgrade(tx => {
      return tx.table('customers').toCollection().modify(customer => {
        customer.tier = customer.tier || 'bronze';
        customer.total_spent = customer.total_spent || 0;
        customer.visit_count = customer.visit_count || 0;
        customer.tags = customer.tags || [];
        customer.points = customer.points || 0;
        customer.notes = customer.notes || '';
      });
    });

    // Phase 3: Supplier Management
    this.version(9).stores({
      suppliers: 'id, workspace_id, name, is_active, *_synced, *_dirty, *_deleted',
      product_suppliers: 'id, product_id, supplier_id, is_preferred, *_synced, *_dirty'
    });

    // Phase 3: Purchase Order System
    this.version(10).stores({
      purchase_orders: 'id, workspace_id, supplier_id, po_number, status, order_date, *_synced, *_dirty',
      purchase_order_items: 'id, po_id, product_id, *_synced, *_dirty'
    });

    // Phase 4: Gift Card System
    this.version(11).stores({
      gift_cards: 'id, workspace_id, card_number, is_active, *_synced, *_dirty'
    });

    // Phase 4: Store Credit System
    this.version(12).stores({
      credit_transactions: 'id, workspace_id, customer_id, type, created_at, *_synced',
      customers: 'id, workspace_id, phone, email, name, tier, referral_code, *_synced, *_dirty, updated_at' // re-declare to add credit_balance
    }).upgrade(tx => {
      return tx.table('customers').toCollection().modify(customer => {
        customer.credit_balance = customer.credit_balance || 0;
      });
    });

    // Phase 4: Layaway System
    this.version(13).stores({
      layaway_orders: 'id, workspace_id, customer_id, order_number, status, created_at, *_synced, *_dirty',
      layaway_order_items: 'id, layaway_id, product_id, *_synced',
      layaway_payments: 'id, layaway_id, created_at, *_synced'
    });

    // Phase 5: Multi-Location Support
    this.version(14).stores({
      locations: 'id, workspace_id, name, is_active, *_synced, *_dirty, *_deleted',
      stock_transfers: 'id, workspace_id, from_location_id, to_location_id, transfer_number, status, requested_date, *_synced, *_dirty',
      stock_transfer_items: 'id, transfer_id, product_id, *_synced, *_dirty',
      location_pricing: 'id, location_id, product_id, is_active, *_synced, *_dirty',
      // Add location_id indexes to existing tables
      products: 'id, workspace_id, location_id, barcode, name, is_quick_key, *_synced, *_dirty, updated_at',
      sales: 'id, workspace_id, location_id, user_id, customer_id, created_at, *_synced, *_dirty',
      stock_movements: 'id, workspace_id, location_id, product_id, created_at, *_synced',
      shifts: 'id, workspace_id, location_id, user_id, status, start_time, *_synced, *_dirty'
    }).upgrade(tx => {
      // Get or create default location
      return tx.table('locations').count().then(count => {
        if (count === 0) {
          // Create default location
          const defaultLocation: LocalLocation = {
            id: crypto.randomUUID(),
            workspace_id: 'default-workspace', // Will be updated when workspace is known
            name: 'Main Location',
            is_active: true,
            timezone: 'Europe/Sofia',
            currency: 'BGN',
            created_at: new Date().toISOString(),
            _synced: false,
            _dirty: true,
          };
          return tx.table('locations').add(defaultLocation).then(locationId => {
            // Update existing records with location_id
            const updates = [
              tx.table('products').toCollection().modify((product: any) => {
                product.location_id = locationId;
              }),
              tx.table('sales').toCollection().modify((sale: any) => {
                sale.location_id = locationId;
              }),
              tx.table('stock_movements').toCollection().modify((movement: any) => {
                movement.location_id = locationId;
              }),
              tx.table('shifts').toCollection().modify((shift: any) => {
                shift.location_id = locationId;
              })
            ];
            return Promise.all(updates);
          });
        }
      });
    });
  }
}

export const db = new PulseDatabase();
