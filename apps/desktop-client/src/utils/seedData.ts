import { db } from '@pulse/core-logic';
import { v4 as uuidv4 } from 'uuid';

const SAMPLE_WORKSPACE_ID = 'default-workspace-001';

const SAMPLE_PRODUCTS = [
  {
    id: uuidv4(),
    workspace_id: SAMPLE_WORKSPACE_ID,
    name: 'Coca Cola 330ml',
    barcode: '5449000000996',
    sku: 'COKE-330',
    cost_price: 0.80,
    sale_price: 1.50,
    stock_quantity: 100,
    min_stock_level: 20,
    updated_at: new Date().toISOString(),
    is_quick_key: false, age_restricted: false,
  },
  {
    id: uuidv4(),
    workspace_id: SAMPLE_WORKSPACE_ID,
    name: 'Sprite 330ml',
    barcode: '5449000017883',
    sku: 'SPRITE-330',
    cost_price: 0.75,
    sale_price: 1.50,
    stock_quantity: 85,
    min_stock_level: 20,
    updated_at: new Date().toISOString(),
    is_quick_key: false, age_restricted: false,
  },
  {
    id: uuidv4(),
    workspace_id: SAMPLE_WORKSPACE_ID,
    name: 'Fanta Orange 330ml',
    barcode: '5449000000446',
    sku: 'FANTA-330',
    cost_price: 0.75,
    sale_price: 1.50,
    stock_quantity: 78,
    min_stock_level: 20,
    updated_at: new Date().toISOString(),
    is_quick_key: false, age_restricted: false,
  },
  {
    id: uuidv4(),
    workspace_id: SAMPLE_WORKSPACE_ID,
    name: 'Water 500ml',
    barcode: '5449000214911',
    sku: 'WATER-500',
    cost_price: 0.30,
    sale_price: 0.80,
    stock_quantity: 200,
    min_stock_level: 50,
    updated_at: new Date().toISOString(),
    is_quick_key: false, age_restricted: false,
  },
  {
    id: uuidv4(),
    workspace_id: SAMPLE_WORKSPACE_ID,
    name: 'Coffee Cappuccino',
    barcode: '8410054906076',
    sku: 'COFFEE-CAP',
    cost_price: 1.20,
    sale_price: 2.50,
    stock_quantity: 45,
    min_stock_level: 15,
    updated_at: new Date().toISOString(),
    is_quick_key: false, age_restricted: false,
  },
  {
    id: uuidv4(),
    workspace_id: SAMPLE_WORKSPACE_ID,
    name: 'Chocolate Bar Milka',
    barcode: '7622300441265',
    sku: 'CHOC-MILKA',
    cost_price: 0.90,
    sale_price: 1.80,
    stock_quantity: 55,
    min_stock_level: 10,
    updated_at: new Date().toISOString(),
    is_quick_key: false, age_restricted: false,
  },
  {
    id: uuidv4(),
    workspace_id: SAMPLE_WORKSPACE_ID,
    name: 'Chips Lay\'s Classic',
    barcode: '5000328942926',
    sku: 'CHIPS-LAYS',
    cost_price: 0.70,
    sale_price: 1.40,
    stock_quantity: 120,
    min_stock_level: 30,
    updated_at: new Date().toISOString(),
    is_quick_key: false, age_restricted: false,
  },
  {
    id: uuidv4(),
    workspace_id: SAMPLE_WORKSPACE_ID,
    name: 'Energy Drink RedBull',
    barcode: '9002490100070',
    sku: 'ENERGY-RB',
    cost_price: 1.50,
    sale_price: 3.00,
    stock_quantity: 60,
    min_stock_level: 15,
    updated_at: new Date().toISOString(),
    is_quick_key: false, age_restricted: false,
  },
  {
    id: uuidv4(),
    workspace_id: SAMPLE_WORKSPACE_ID,
    name: 'Sandwich Ham & Cheese',
    barcode: '2000000000001',
    sku: 'SAND-HC',
    cost_price: 2.00,
    sale_price: 4.50,
    stock_quantity: 15,
    min_stock_level: 5,
    updated_at: new Date().toISOString(),
    is_quick_key: false, age_restricted: false,
  },
  {
    id: uuidv4(),
    workspace_id: SAMPLE_WORKSPACE_ID,
    name: 'Juice Orange 1L',
    barcode: '5449000131805',
    sku: 'JUICE-OR',
    cost_price: 1.80,
    sale_price: 3.50,
    stock_quantity: 35,
    min_stock_level: 10,
    updated_at: new Date().toISOString(),
    is_quick_key: false, age_restricted: false,
  },
  {
    id: uuidv4(),
    workspace_id: SAMPLE_WORKSPACE_ID,
    name: 'Gum Orbit',
    barcode: '8000500050002',
    sku: 'GUM-ORBIT',
    cost_price: 0.40,
    sale_price: 1.00,
    stock_quantity: 90,
    min_stock_level: 20,
    updated_at: new Date().toISOString(),
    is_quick_key: false, age_restricted: false,
  },
  {
    id: uuidv4(),
    workspace_id: SAMPLE_WORKSPACE_ID,
    name: 'Ice Cream Magnum',
    barcode: '8714100699492',
    sku: 'ICE-MAGNUM',
    cost_price: 1.50,
    sale_price: 3.20,
    stock_quantity: 40,
    min_stock_level: 10,
    updated_at: new Date().toISOString(),
    is_quick_key: false, age_restricted: false,
  },
  {
    id: uuidv4(),
    workspace_id: SAMPLE_WORKSPACE_ID,
    name: 'Bread White',
    barcode: '2100000000001',
    sku: 'BREAD-W',
    cost_price: 0.60,
    sale_price: 1.20,
    stock_quantity: 25,
    min_stock_level: 5,
    updated_at: new Date().toISOString(),
    is_quick_key: false, age_restricted: false,
  },
  {
    id: uuidv4(),
    workspace_id: SAMPLE_WORKSPACE_ID,
    name: 'Milk 1L',
    barcode: '5449000096517',
    sku: 'MILK-1L',
    cost_price: 1.20,
    sale_price: 2.30,
    stock_quantity: 50,
    min_stock_level: 15,
    updated_at: new Date().toISOString(),
    is_quick_key: false, age_restricted: false,
  },
  {
    id: uuidv4(),
    workspace_id: SAMPLE_WORKSPACE_ID,
    name: 'Beer Heineken 330ml',
    barcode: '8710103862048',
    sku: 'BEER-HEIN',
    cost_price: 1.00,
    sale_price: 2.20,
    stock_quantity: 72,
    min_stock_level: 20,
    updated_at: new Date().toISOString(),
    is_quick_key: false, age_restricted: false,
  },
];

/**
 * Seed the local database with sample products
 */
export async function seedDatabase() {
  try {
    console.log('Starting database seed...');

    // Clear existing data
    await db.products.clear();
    await db.sales.clear();
    await db.sale_items.clear();
    await db.stock_movements.clear();

    // Seed workspace
    await db.workspaces.put({
      id: SAMPLE_WORKSPACE_ID,
      name: 'Demo Store',
      currency_code: 'BGN',
      created_at: new Date().toISOString(),
    });

    // Seed products
    await db.products.bulkAdd(SAMPLE_PRODUCTS);

    console.log(`✅ Seeded ${SAMPLE_PRODUCTS.length} products successfully!`);
    
    return {
      success: true,
      productsAdded: SAMPLE_PRODUCTS.length,
    };
  } catch (error) {
    console.error('❌ Seed failed:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// Auto-seed on first run
if (typeof window !== 'undefined') {
  db.products.count().then((count) => {
    if (count === 0) {
      console.log('No products found. Seeding database...');
      seedDatabase();
    }
  });
}
