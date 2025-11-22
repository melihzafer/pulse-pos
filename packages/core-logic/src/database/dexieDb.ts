import Dexie, { Table } from 'dexie';
import type { Product, Sale, SaleItem, StockMovement, Workspace, ParkedSale, Shift, CashTransaction, Customer, ProductBarcode, Promotion } from '../types';

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
  }
}

export const db = new PulseDatabase();
