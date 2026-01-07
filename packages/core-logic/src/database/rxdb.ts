import {
  createRxDatabase,
  RxDatabase,
  RxCollection,
  RxJsonSchema,
  RxDocument,
  addRxPlugin,
  type RxStorage,
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';

// Add migration plugin (required for schema versioning)
addRxPlugin(RxDBMigrationSchemaPlugin);

const isDev = process.env.NODE_ENV === 'development';

// Enable dev mode for better error messages (required for ignoreDuplicate)
if (isDev) {
  addRxPlugin(RxDBDevModePlugin);
}

// Get storage - wrap with validator in dev mode
function getStorage(): RxStorage<any, any> {
  const baseStorage = getRxStorageDexie();
  if (isDev) {
    return wrappedValidateAjvStorage({ storage: baseStorage });
  }
  return baseStorage;
}

// We will use 'dexie' as the underlying storage for RxDB because it's stable and widely supported.
// But we are using the robust RxDB layer on top of it.

export type RxProduct = {
  id: string;
  workspace_id: string;
  name: string;
  barcode?: string;
  priceCents: number; // Integer currency
  stock_quantity: number;
  category?: string;
  updated_at: string; // ISO string
};

export type ProductDoc = RxDocument<RxProduct>;
export type ProductCollection = RxCollection<RxProduct>;

export type RxTransaction = {
  id: string;
  timestamp: string;
  totalCents: number;
  items: Array<{
    product_id: string;
    quantity: number;
    priceCents: number;
    name: string;
  }>;
  payment_methods: Array<{
    method: 'CASH' | 'CARD' | 'OTHER';
    amountCents: number;
  }>;
  sync_status: 'PENDING' | 'SYNCED';
};

export type RxCustomer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  total_spent?: number;
  visit_count?: number;
  tags?: string[];
  points?: number;
  notes?: string;
  credit_balance?: number;
  updated_at: string;
};

export type TransactionDoc = RxDocument<RxTransaction>;
export type TransactionCollection = RxCollection<RxTransaction>;
export type CustomerDoc = RxDocument<RxCustomer>;
export type CustomerCollection = RxCollection<RxCustomer>;

export type RxCashier = {
  id: string;
  username: string;
  pin_code: string;
  full_name: string;
  is_active: boolean;
  role: 'admin' | 'manager' | 'cashier';
  updated_at?: string; // RxDB likes updated_at
  role_id?: string;
  workspace_id?: string;
};
export type CashierDoc = RxDocument<RxCashier>;
export type CashierCollection = RxCollection<RxCashier>;

export type MyDatabaseCollections = {
  products: ProductCollection;
  transactions: TransactionCollection;
  customers: CustomerCollection;
  cashiers: CashierCollection;
};

export type MyDatabase = RxDatabase<MyDatabaseCollections>;

const productSchema: RxJsonSchema<RxProduct> = {
  title: 'product schema',
  version: 1, // Incremented for workspace_id addition
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100, // primary key needs max length
    },
    workspace_id: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    barcode: {
      type: 'string',
    },
    priceCents: {
      type: 'integer',
      minimum: 0,
    },
    stock_quantity: {
      type: 'number',
    },
    category: {
      type: 'string',
    },
    updated_at: {
      type: 'string',
      format: 'date-time',
    },
  },
  required: ['id', 'workspace_id', 'name', 'priceCents', 'stock_quantity', 'updated_at'],
};

const transactionSchema: RxJsonSchema<RxTransaction> = {
  title: 'transaction schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
    },
    totalCents: {
      type: 'integer',
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          quantity: { type: 'number' },
          priceCents: { type: 'integer' },
          name: { type: 'string' },
        },
      },
    },
    payment_methods: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          method: { type: 'string', enum: ['CASH', 'CARD', 'OTHER'] },
          amountCents: { type: 'integer' },
        },
      },
    },
    sync_status: {
      type: 'string',
      enum: ['PENDING', 'SYNCED'],
    },
  },
  required: ['id', 'timestamp', 'totalCents', 'items', 'payment_methods', 'sync_status'],
};

const customerSchema: RxJsonSchema<RxCustomer> = {
  title: 'customer schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    phone: { type: 'string' },
    email: { type: 'string' },
    tier: { type: 'string', enum: ['bronze', 'silver', 'gold', 'platinum'] },
    total_spent: { type: 'number' },
    visit_count: { type: 'number' },
    tags: { type: 'array', items: { type: 'string' } },
    points: { type: 'number' },
    notes: { type: 'string' },
    credit_balance: { type: 'number' },
    updated_at: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'name', 'updated_at'],
};

const cashierSchema: RxJsonSchema<RxCashier> = {
  title: 'cashier schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    username: { type: 'string' },
    pin_code: { type: 'string' },
    full_name: { type: 'string' },
    is_active: { type: 'boolean' },
    role: { type: 'string', enum: ['admin', 'manager', 'cashier'] },
    updated_at: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'username', 'pin_code', 'role'],
};

// Handle HMR by persisting the promise on the global object
const globalAny: any = globalThis;
let dbPromise: Promise<MyDatabase> | null = globalAny.pulseDbPromise || null;

export const createDatabase = async (): Promise<MyDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    console.log('🔌 Initializing RxDB...');
    
    const db = await createRxDatabase<MyDatabaseCollections>({
      name: 'pulse_pos_db',
      storage: getStorage(),
      ignoreDuplicate: true,
    });

    // Check if collections already exist (reused DB instance)
    if (!db.collections.products) {
      console.log('📦 Creating collections...');
      await db.addCollections({
        products: {
          schema: productSchema,
          migrationStrategies: {
            // Migration from version 0 to version 1: add workspace_id
            1: (oldDoc: any) => {
              return {
                ...oldDoc,
                workspace_id: oldDoc.workspace_id || 'default',
              };
            },
          },
        },
        transactions: {
          schema: transactionSchema,
        },
        customers: {
          schema: customerSchema,
        },
        cashiers: {
          schema: cashierSchema,
        },
      });
    } else {
      console.log('📦 Collections already exist, skipping creation.');
    }

    console.log('✅ RxDB initialized with offline-first support');
    return db;
  })();

  globalAny.pulseDbPromise = dbPromise;
  return dbPromise;
};

export const getDb = () => {
    if(!dbPromise) throw new Error("Database not initialized. Call createDatabase first.");
    return dbPromise;
}
