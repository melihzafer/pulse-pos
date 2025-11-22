import { z } from 'zod';

// --- Database Enums ---
export const PaymentMethodSchema = z.enum(['cash', 'card', 'food_voucher', 'split']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const SaleStatusSchema = z.enum(['completed', 'refunded', 'void']);
export type SaleStatus = z.infer<typeof SaleStatusSchema>;

export const StockMovementReasonSchema = z.enum(['sale', 'restock', 'waste', 'correction', 'return']);
export type StockMovementReason = z.infer<typeof StockMovementReasonSchema>;

export const ShiftStatusSchema = z.enum(['open', 'closed']);
export type ShiftStatus = z.infer<typeof ShiftStatusSchema>;

export const CashTransactionTypeSchema = z.enum(['sale', 'refund', 'pay_in', 'pay_out']);
export type CashTransactionType = z.infer<typeof CashTransactionTypeSchema>;

// --- Domain Models ---

export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  currency_code: z.string().default('BGN'),
  created_at: z.string().datetime().optional(),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export const ProductSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  name: z.string().min(1),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  cost_price: z.number().min(0),
  sale_price: z.number().min(0),
  stock_quantity: z.number(),
  min_stock_level: z.number().default(5),
  category_id: z.string().uuid().optional(),
  updated_at: z.string().datetime().optional(),
  is_quick_key: z.boolean().default(false),
  quick_key_color: z.string().optional(),
  age_restricted: z.boolean().default(false),
  deposit_sku_id: z.string().uuid().optional(),
});
export type Product = z.infer<typeof ProductSchema>;

export const ProductBarcodeSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  barcode: z.string().min(1),
  multiplier: z.number().default(1), // e.g., 1 for unit, 6 for case
  created_at: z.string().datetime().optional(),
});
export type ProductBarcode = z.infer<typeof ProductBarcodeSchema>;

export const PromotionTypeSchema = z.enum(['bogo', 'discount_percent', 'fixed_amount', 'bundle', 'tiered', 'happy_hour']);
export type PromotionType = z.infer<typeof PromotionTypeSchema>;

export const PromotionSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  type: PromotionTypeSchema,
  rules: z.any(), // JSON blob for flexible rules
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  is_active: z.boolean().default(true),
  priority: z.number().default(0),
  min_purchase_amount: z.number().optional(), // Minimum cart total to apply
  max_uses: z.number().optional(), // Maximum number of times this promo can be used
  times_used: z.number().default(0), // Track usage count
  target_variants: z.array(z.string()).optional(), // Product IDs or variant codes this applies to
  conditions: z.object({
    days_of_week: z.array(z.number()).optional(), // 0-6 (Sunday-Saturday)
    time_range: z.object({
      start: z.string().optional(), // HH:mm format
      end: z.string().optional(),
    }).optional(),
    customer_groups: z.array(z.string()).optional(), // Future: VIP, Member, etc.
  }).optional(),
  created_at: z.string().datetime().optional(),
});
export type Promotion = z.infer<typeof PromotionSchema>;

export const CartItemSchema = z.object({
  id: z.string().uuid(),
  product: ProductSchema,
  quantity: z.number(),
  subtotal: z.number(),
  isPayItForward: z.boolean().optional(),
  redeemedFromPifId: z.string().optional(),
  priceOverride: z.number().optional(),
  discount: z.number().optional(),
  appliedPromotionId: z.string().optional(),
});
export type CartItem = z.infer<typeof CartItemSchema>;

export const ParkedSaleSchema = z.object({
  id: z.string().uuid(),
  items: z.array(CartItemSchema),
  parked_at: z.string().datetime(),
  note: z.string().optional(),
});
export type ParkedSale = z.infer<typeof ParkedSaleSchema>;

export const SaleItemSchema = z.object({
  id: z.string().uuid(),
  sale_id: z.string().uuid(),
  product_id: z.string().uuid(),
  product_name_snapshot: z.string(),
  cost_snapshot: z.number(),
  price_snapshot: z.number(),
  quantity: z.number(),
});
export type SaleItem = z.infer<typeof SaleItemSchema>;

export const SalePaymentSchema = z.object({
  method: PaymentMethodSchema,
  amount: z.number(),
});
export type SalePayment = z.infer<typeof SalePaymentSchema>;

export const CustomerSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  points: z.number().default(0),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Customer = z.infer<typeof CustomerSchema>;

export const SaleSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(), // Added customer_id
  total_amount: z.number(),
  payment_method: PaymentMethodSchema,
  payments: z.array(SalePaymentSchema).optional(),
  status: SaleStatusSchema.default('completed'),
  synced_at: z.string().datetime().optional(),
  created_at: z.string().datetime().optional(),
  items: z.array(SaleItemSchema).optional(), // For UI convenience
});
export type Sale = z.infer<typeof SaleSchema>;

export const StockMovementSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  product_id: z.string().uuid(),
  quantity_change: z.number(),
  reason: StockMovementReasonSchema,
  reference_id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
});
export type StockMovement = z.infer<typeof StockMovementSchema>;

export const ShiftSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  start_cash: z.number(),
  end_cash_expected: z.number().optional(),
  end_cash_actual: z.number().optional(),
  status: ShiftStatusSchema.default('open'),
  notes: z.string().optional(),
});
export type Shift = z.infer<typeof ShiftSchema>;

export const CashTransactionSchema = z.object({
  id: z.string().uuid(),
  shift_id: z.string().uuid(),
  type: CashTransactionTypeSchema,
  amount: z.number(),
  reason: z.string().optional(),
  created_at: z.string().datetime(),
});
export type CashTransaction = z.infer<typeof CashTransactionSchema>;
