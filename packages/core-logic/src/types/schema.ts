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

export const StockAdjustmentReasonSchema = z.enum(['damaged', 'expired', 'theft', 'counting_error', 'promotion', 'sample', 'other']);
export type StockAdjustmentReason = z.infer<typeof StockAdjustmentReasonSchema>;

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
  location_id: z.string().uuid().optional(), // Phase 5: Multi-location support
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
  discount: z.number().optional(),
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
  // Phase 2 additions
  birth_date: z.string().optional(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).default('bronze'),
  total_spent: z.number().default(0),
  visit_count: z.number().default(0),
  last_visit_date: z.string().datetime().optional(),
  preferences: z.any().optional(),
  tags: z.array(z.string()).default([]),
  referral_code: z.string().optional(),
  referred_by: z.string().uuid().optional(),
  notes: z.string().optional(),
  // Phase 4 additions
  credit_balance: z.number().default(0),
});
export type Customer = z.infer<typeof CustomerSchema>;

export const SaleSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  location_id: z.string().uuid().optional(), // Phase 5: Multi-location support
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
  location_id: z.string().uuid().optional(), // Phase 5: Multi-location support
  product_id: z.string().uuid(),
  quantity_change: z.number(),
  reason: StockMovementReasonSchema,
  reference_id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  // Phase 3.3 additions for batch tracking
  batch_number: z.string().optional(),
  expiration_date: z.string().datetime().optional(),
  adjustment_reason: StockAdjustmentReasonSchema.optional(),
  adjustment_notes: z.string().optional(),
  adjustment_photo_url: z.string().optional(),
});
export type StockMovement = z.infer<typeof StockMovementSchema>;

export const ShiftSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  location_id: z.string().uuid().optional(), // Phase 5: Multi-location support
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

// --- Phase 3: Supplier & Purchase Order Schemas ---

export const PaymentTermsSchema = z.enum(['cash', 'net15', 'net30', 'net60']);
export type PaymentTerms = z.infer<typeof PaymentTermsSchema>;

export const SupplierSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  name: z.string().min(1),
  contact_person: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  payment_terms: PaymentTermsSchema.default('cash'),
  lead_time_days: z.number().default(7),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Supplier = z.infer<typeof SupplierSchema>;

export const ProductSupplierSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  supplier_sku: z.string().optional(),
  cost_price: z.number().min(0),
  is_preferred: z.boolean().default(false),
  min_order_quantity: z.number().default(1),
  created_at: z.string().datetime().optional(),
});
export type ProductSupplier = z.infer<typeof ProductSupplierSchema>;

export const PurchaseOrderStatusSchema = z.enum(['draft', 'sent', 'confirmed', 'received', 'cancelled']);
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatusSchema>;

export const PurchaseOrderSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  po_number: z.string(), // auto-generated PO-001, PO-002
  supplier_id: z.string().uuid(),
  status: PurchaseOrderStatusSchema.default('draft'),
  order_date: z.string().datetime(),
  expected_delivery_date: z.string().datetime().optional(),
  actual_delivery_date: z.string().datetime().optional(),
  subtotal: z.number(),
  tax: z.number().default(0),
  shipping: z.number().default(0),
  total: z.number(),
  notes: z.string().optional(),
  created_by: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;

export const PurchaseOrderItemSchema = z.object({
  id: z.string().uuid(),
  po_id: z.string().uuid(),
  product_id: z.string().uuid(),
  product_name: z.string(), // snapshot
  quantity_ordered: z.number(),
  quantity_received: z.number().default(0),
  unit_cost: z.number(),
  total_cost: z.number(),
  notes: z.string().optional(),
});
export type PurchaseOrderItem = z.infer<typeof PurchaseOrderItemSchema>;

// --- Phase 4: Payment & Financial Schemas ---

export const GiftCardSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  card_number: z.string(), // barcode format
  balance: z.number(),
  original_amount: z.number(),
  is_active: z.boolean().default(true),
  issued_date: z.string().datetime(),
  last_used_date: z.string().datetime().optional(),
  issued_by_user_id: z.string().uuid().optional(),
  sold_to_customer_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  created_at: z.string().datetime().optional(),
});
export type GiftCard = z.infer<typeof GiftCardSchema>;

export const CreditTransactionTypeSchema = z.enum(['issued', 'redeemed', 'expired', 'adjusted']);
export type CreditTransactionType = z.infer<typeof CreditTransactionTypeSchema>;

export const CreditTransactionSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  type: CreditTransactionTypeSchema,
  amount: z.number(),
  balance_after: z.number(),
  reason: z.string().optional(),
  reference_id: z.string().uuid().optional(), // sale_id or refund_id
  created_by: z.string().uuid().optional(),
  created_at: z.string().datetime(),
});
export type CreditTransaction = z.infer<typeof CreditTransactionSchema>;

export const LayawayOrderStatusSchema = z.enum(['active', 'completed', 'cancelled']);
export type LayawayOrderStatus = z.infer<typeof LayawayOrderStatusSchema>;

export const LayawayOrderSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  order_number: z.string(), // auto-generated LAY-001
  customer_id: z.string().uuid(),
  user_id: z.string().uuid(), // cashier who created the layaway
  status: LayawayOrderStatusSchema.default('active'),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  deposit_amount: z.number(),
  balance_due: z.number(),
  deposit_percentage: z.number().default(20),
  restocking_fee_percent: z.number().default(10),
  created_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  cancelled_at: z.string().datetime().optional(),
  notes: z.string().optional(),
});
export type LayawayOrder = z.infer<typeof LayawayOrderSchema>;

export const LayawayOrderItemSchema = z.object({
  id: z.string().uuid(),
  layaway_id: z.string().uuid(),
  product_id: z.string().uuid(),
  product_name: z.string(), // snapshot
  quantity: z.number(),
  unit_price: z.number(),
  subtotal: z.number(),
});
export type LayawayOrderItem = z.infer<typeof LayawayOrderItemSchema>;

export const LayawayPaymentSchema = z.object({
  id: z.string().uuid(),
  layaway_id: z.string().uuid(),
  amount: z.number(),
  payment_date: z.string().datetime(),
  payment_method: PaymentMethodSchema.optional(),
  notes: z.string().optional(),
});
export type LayawayPayment = z.infer<typeof LayawayPaymentSchema>;

// --- Phase 5: Multi-Location Support Schemas ---

export const LocationSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  manager_user_id: z.string().uuid().optional(),
  timezone: z.string().default('Europe/Sofia'),
  currency: z.string().default('BGN'),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Location = z.infer<typeof LocationSchema>;

export const StockTransferStatusSchema = z.enum(['requested', 'approved', 'shipped', 'received', 'cancelled']);
export type StockTransferStatus = z.infer<typeof StockTransferStatusSchema>;

export const StockTransferSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  transfer_number: z.string(), // auto-generated TRF-001
  from_location_id: z.string().uuid(),
  to_location_id: z.string().uuid(),
  status: StockTransferStatusSchema.default('requested'),
  requested_by_user_id: z.string().uuid(),
  approved_by_user_id: z.string().uuid().optional(),
  requested_date: z.string().datetime(),
  approved_date: z.string().datetime().optional(),
  shipped_date: z.string().datetime().optional(),
  received_date: z.string().datetime().optional(),
  notes: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type StockTransfer = z.infer<typeof StockTransferSchema>;

export const StockTransferItemSchema = z.object({
  id: z.string().uuid(),
  transfer_id: z.string().uuid(),
  product_id: z.string().uuid(),
  product_name: z.string(), // snapshot
  quantity_requested: z.number(),
  quantity_approved: z.number().default(0),
  quantity_received: z.number().default(0),
  notes: z.string().optional(),
});
export type StockTransferItem = z.infer<typeof StockTransferItemSchema>;

export const LocationPricingSchema = z.object({
  id: z.string().uuid(),
  location_id: z.string().uuid(),
  product_id: z.string().uuid(),
  sale_price: z.number().min(0),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type LocationPricing = z.infer<typeof LocationPricingSchema>;
