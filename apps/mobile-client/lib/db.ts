import Dexie, { Table } from 'dexie';
import {
  Product,
  Sale,
  SaleItem,
  Promotion,
  Customer,
  ProductBarcode,
  StockMovement,
} from '@pulse/core-logic';

// Mobile database using Dexie (same as desktop)
export class MobilePulseDatabase extends Dexie {
  products!: Table<Product, string>;
  sales!: Table<Sale, string>;
  sale_items!: Table<SaleItem, string>;
  promotions!: Table<Promotion, string>;
  customers!: Table<Customer, string>;
  product_barcodes!: Table<ProductBarcode, string>;
  stock_movements!: Table<StockMovement, string>;

  constructor() {
    super('pulse-mobile');
    
    this.version(6).stores({
      products: 'id, name, barcode, sku, category, *supplier_ids',
      sales: 'id, workspace_id, shift_id, cashier_id, created_at, status',
      sale_items: 'id, sale_id, product_id',
      promotions: 'id, workspace_id, name, type, start_date, end_date, is_active',
      customers: 'id, workspace_id, name, phone, email',
      product_barcodes: 'id, product_id, barcode',
      stock_movements: 'id, product_id, workspace_id, created_at, type',
    });
  }
}

export const db = new MobilePulseDatabase();

export const initDatabase = async () => {
  try {
    await db.open();
    console.log('✅ Mobile database initialized');
    
    // Check if needs seeding
    const productCount = await db.products.count();
    if (productCount === 0) {
      await seedDatabase();
    }
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }
};

export const seedDatabase = async () => {
  try {
    const sampleProducts: Product[] = [
      {
        id: 'mobile-1',
        workspace_id: 'default',
        name: 'Espresso',
        barcode: '111',
        sku: 'ESP-001',
        category: 'beverages',
        purchase_price: 1.50,
        sale_price: 3.50,
        stock_quantity: 100,
        low_stock_threshold: 20,
        is_favorite: true,
        age_restricted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'mobile-2',
        workspace_id: 'default',
        name: 'Cappuccino',
        barcode: '222',
        sku: 'CAP-001',
        category: 'beverages',
        purchase_price: 2.00,
        sale_price: 4.50,
        stock_quantity: 80,
        low_stock_threshold: 20,
        is_favorite: true,
        age_restricted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'mobile-3',
        workspace_id: 'default',
        name: 'Croissant',
        barcode: '333',
        sku: 'CRO-001',
        category: 'food',
        purchase_price: 1.50,
        sale_price: 3.00,
        stock_quantity: 50,
        low_stock_threshold: 10,
        is_favorite: false,
        age_restricted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'mobile-4',
        workspace_id: 'default',
        name: 'Water 500ml',
        barcode: '444',
        sku: 'WAT-001',
        category: 'beverages',
        purchase_price: 0.50,
        sale_price: 1.50,
        stock_quantity: 200,
        low_stock_threshold: 50,
        is_favorite: false,
        age_restricted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    await db.products.bulkAdd(sampleProducts);
    console.log('✅ Database seeded with', sampleProducts.length, 'products');
  } catch (error) {
    console.error('❌ Failed to seed database:', error);
  }
};

export const getProducts = async (): Promise<Product[]> => {
  return await db.products.toArray();
};

export const getProductByBarcode = async (barcode: string): Promise<Product | undefined> => {
  return await db.products.where('barcode').equals(barcode).first();
};

export const getLowStockProducts = async (): Promise<Product[]> => {
  const products = await db.products.toArray();
  return products.filter(p => p.stock_quantity <= (p.low_stock_threshold || 0));
};

export const getTodaySales = async (): Promise<Sale[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  
  return await db.sales
    .where('created_at')
    .aboveOrEqual(todayISO)
    .toArray();
};
