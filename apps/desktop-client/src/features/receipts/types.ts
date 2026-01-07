export interface ReceiptComponent {
  id: string;
  type: 'text' | 'logo' | 'field' | 'items' | 'totals' | 'divider' | 'barcode' | 'qrcode' | 'spacer';
  content?: string;
  field?: string;  // For dynamic fields like 'date', 'receipt_number', 'customer_name'
  alignment?: 'left' | 'center' | 'right';
  fontSize?: 'small' | 'normal' | 'large' | 'xlarge';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  height?: number;  // For spacers
  showIf?: string;  // Conditional rendering: 'has_customer', 'has_discount', 'has_promo'
}

export interface ReceiptTemplate {
  id: string;
  name: string;
  description?: string;
  paperWidth: '58mm' | '80mm';
  components: ReceiptComponent[];
  isDefault?: boolean;
  language?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptData {
  receiptNumber: string;
  date: string;
  time: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    discount?: number;
    total: number;
  }[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  paymentMethod: string;
  amountTendered?: number;
  change?: number;
  customer?: {
    name: string;
    phone?: string;
    email?: string;
    loyaltyPoints?: number;
    tier?: string;
  };
  cashier?: string;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  promotionMessage?: string;
}

export interface ZReportData {
  reportNumber: string;
  date: string;
  shiftStart: string;
  shiftEnd: string;
  cashier: string;
  location: string;
  
  // Sales summary
  totalSales: number;
  transactionCount: number;
  itemsSold: number;
  averageTransaction: number;
  
  // By payment method
  cashSales: number;
  cardSales: number;
  giftCardSales: number;
  storeCreditSales: number;
  
  // Refunds and voids
  refundsCount: number;
  refundsTotal: number;
  voidsCount: number;
  voidsTotal: number;
  
  // Cash drawer
  openingCash: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  
  // Tax breakdown
  taxableAmount: number;
  vatAmount: number;
  vatRate: number;
  
  // Top products
  topProducts: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
}

export interface LabelTemplate {
  id: string;
  name: string;
  width: number;  // mm
  height: number; // mm
  type: 'barcode' | 'shelf' | 'price';
  showBarcode: boolean;
  showPrice: boolean;
  showName: boolean;
  showSku: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export const DEFAULT_RECEIPT_TEMPLATE: ReceiptTemplate = {
  id: 'default',
  name: 'Default Receipt',
  description: 'Standard receipt template',
  paperWidth: '80mm',
  components: [
    { id: '1', type: 'logo', alignment: 'center' },
    { id: '2', type: 'text', content: 'PULSE POS', alignment: 'center', fontSize: 'xlarge', bold: true },
    { id: '3', type: 'field', field: 'store_address', alignment: 'center', fontSize: 'small' },
    { id: '4', type: 'field', field: 'store_phone', alignment: 'center', fontSize: 'small' },
    { id: '5', type: 'divider' },
    { id: '6', type: 'field', field: 'date_time', alignment: 'left', fontSize: 'small' },
    { id: '7', type: 'field', field: 'receipt_number', alignment: 'left', fontSize: 'small' },
    { id: '8', type: 'field', field: 'cashier', alignment: 'left', fontSize: 'small' },
    { id: '9', type: 'field', field: 'customer_name', alignment: 'left', fontSize: 'small', showIf: 'has_customer' },
    { id: '10', type: 'divider' },
    { id: '11', type: 'items' },
    { id: '12', type: 'divider' },
    { id: '13', type: 'totals' },
    { id: '14', type: 'divider' },
    { id: '15', type: 'field', field: 'payment_method', alignment: 'left' },
    { id: '16', type: 'field', field: 'amount_tendered', alignment: 'left', showIf: 'is_cash' },
    { id: '17', type: 'field', field: 'change', alignment: 'left', showIf: 'is_cash' },
    { id: '18', type: 'spacer', height: 10 },
    { id: '19', type: 'qrcode', alignment: 'center' },
    { id: '20', type: 'spacer', height: 5 },
    { id: '21', type: 'text', content: 'Thank you for your purchase!', alignment: 'center', fontSize: 'normal' },
    { id: '22', type: 'text', content: 'Visit us again soon!', alignment: 'center', fontSize: 'small' },
    { id: '23', type: 'spacer', height: 10 },
    { id: '24', type: 'field', field: 'loyalty_points', alignment: 'center', fontSize: 'small', showIf: 'has_customer' },
  ],
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DYNAMIC_FIELDS = [
  { id: 'store_name', label: 'Store Name', category: 'Store' },
  { id: 'store_address', label: 'Store Address', category: 'Store' },
  { id: 'store_phone', label: 'Store Phone', category: 'Store' },
  { id: 'date', label: 'Date', category: 'Transaction' },
  { id: 'time', label: 'Time', category: 'Transaction' },
  { id: 'date_time', label: 'Date & Time', category: 'Transaction' },
  { id: 'receipt_number', label: 'Receipt Number', category: 'Transaction' },
  { id: 'cashier', label: 'Cashier Name', category: 'Transaction' },
  { id: 'customer_name', label: 'Customer Name', category: 'Customer' },
  { id: 'customer_phone', label: 'Customer Phone', category: 'Customer' },
  { id: 'customer_email', label: 'Customer Email', category: 'Customer' },
  { id: 'loyalty_points', label: 'Loyalty Points Earned', category: 'Customer' },
  { id: 'customer_tier', label: 'Loyalty Tier', category: 'Customer' },
  { id: 'subtotal', label: 'Subtotal', category: 'Payment' },
  { id: 'discount_total', label: 'Discount Total', category: 'Payment' },
  { id: 'tax_total', label: 'Tax/VAT', category: 'Payment' },
  { id: 'total', label: 'Total', category: 'Payment' },
  { id: 'payment_method', label: 'Payment Method', category: 'Payment' },
  { id: 'amount_tendered', label: 'Amount Tendered', category: 'Payment' },
  { id: 'change', label: 'Change Due', category: 'Payment' },
  { id: 'promo_message', label: 'Promotion Message', category: 'Promotion' },
];

export const CONDITION_OPTIONS = [
  { value: '', label: 'Always show' },
  { value: 'has_customer', label: 'Customer attached' },
  { value: 'has_discount', label: 'Has discounts' },
  { value: 'has_promo', label: 'Promotion applied' },
  { value: 'is_cash', label: 'Cash payment' },
  { value: 'is_card', label: 'Card payment' },
];
