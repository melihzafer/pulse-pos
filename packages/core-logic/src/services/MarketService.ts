import { db } from '../database/dexieDb';
import { parseScaleBarcode } from '../utils/scaleParser';
import type { Product, CartItem, Promotion } from '../types';

export interface ScannedItemResult {
  product: Product;
  quantity: number;
  priceOverride?: number;
  isScaleItem?: boolean;
}

export class MarketService {
  
  /**
   * Finds a product by barcode, handling:
   * 1. Direct barcode match
   * 2. Multi-unit barcode match (returns parent product with multiplier)
   * 3. Scale barcode parsing (Price/Weight embedded)
   */
  async findProduct(barcode: string): Promise<ScannedItemResult | null> {
    // 1. Direct match
    const product = await db.products.where('barcode').equals(barcode).first();
    if (product) {
      return { product, quantity: 1 };
    }

    // 2. Multi-unit barcode
    const multiUnit = await db.product_barcodes.where('barcode').equals(barcode).first();
    if (multiUnit) {
      const parentProduct = await db.products.get(multiUnit.product_id);
      if (parentProduct) {
        return { product: parentProduct, quantity: multiUnit.multiplier };
      }
    }

    // 3. Scale barcode
    const parsed = parseScaleBarcode(barcode);
    if (parsed) {
      // Find product by SKU (Item Code)
      const scaleProduct = await db.products.where('sku').equals(parsed.sku).first();
      
      if (scaleProduct) {
        if (parsed.type === 'price_embedded') {
          // Price embedded: Quantity = Total Price / Unit Price
          // Example: Meat pack costs $12.50, Unit price is $25.00/kg -> 0.5kg
          const quantity = scaleProduct.sale_price > 0 
            ? Number((parsed.value / scaleProduct.sale_price).toFixed(3))
            : 1;
            
          return { 
            product: scaleProduct, 
            quantity, 
            priceOverride: undefined, // We calculate quantity, so price comes from qty * unit_price
            isScaleItem: true
          };
        } else if (parsed.type === 'weight_embedded') {
          // Weight embedded: Quantity is the weight
          return { 
            product: scaleProduct, 
            quantity: parsed.value,
            isScaleItem: true
          };
        }
      }
    }

    return null;
  }

  /**
   * Applies active promotions to the cart.
   * Enhanced with: time/day conditions, usage limits, min purchase validation
   */
  async applyPromotions(cartItems: CartItem[]): Promise<CartItem[]> {
    const activePromotions = await db.promotions
      .filter(p => p.is_active === true || p.is_active === 1)
      .toArray();

    // Filter valid promotions based on date, time, day, and usage limits
    const now = new Date();
    const validPromotions = activePromotions.filter(p => {
      // Date range check
      if (p.start_date && new Date(p.start_date) > now) return false;
      if (p.end_date && new Date(p.end_date) < now) return false;
      
      // Usage limit check
      if (p.max_uses && p.times_used >= p.max_uses) return false;
      
      // Day of week check
      if (p.conditions?.days_of_week && p.conditions.days_of_week.length > 0) {
        const currentDay = now.getDay(); // 0-6 (Sunday-Saturday)
        if (!p.conditions.days_of_week.includes(currentDay)) return false;
      }
      
      // Time range check
      if (p.conditions?.time_range) {
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const { start, end } = p.conditions.time_range;
        
        if (start && currentTime < start) return false;
        if (end && currentTime > end) return false;
      }
      
      return true;
    });

    // Calculate cart subtotal for min purchase check
    const cartSubtotal = cartItems.reduce((sum, item) => {
      const unitPrice = item.priceOverride ?? item.product.sale_price;
      return sum + (unitPrice * item.quantity);
    }, 0);

    // Filter by minimum purchase amount
    const applicablePromotions = validPromotions.filter(p => {
      if (p.min_purchase_amount && cartSubtotal < p.min_purchase_amount) return false;
      return true;
    });

    // Sort by priority (descending)
    applicablePromotions.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    let updatedCart = [...cartItems];

    for (const promo of applicablePromotions) {
      updatedCart = this.applySinglePromotion(updatedCart, promo);
    }

    return updatedCart;
  }

  /**
   * Gets all currently active promotions with full validation
   */
  async getActivePromotions(): Promise<Promotion[]> {
    const activePromotions = await db.promotions
      .filter(p => p.is_active === true || p.is_active === 1)
      .toArray();

    const now = new Date();
    return activePromotions.filter(p => {
      // Date range
      if (p.start_date && new Date(p.start_date) > now) return false;
      if (p.end_date && new Date(p.end_date) < now) return false;
      
      // Usage limit
      if (p.max_uses && p.times_used >= p.max_uses) return false;
      
      // Day of week
      if (p.conditions?.days_of_week && p.conditions.days_of_week.length > 0) {
        const currentDay = now.getDay();
        if (!p.conditions.days_of_week.includes(currentDay)) return false;
      }
      
      // Time range
      if (p.conditions?.time_range) {
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const { start, end } = p.conditions.time_range;
        
        if (start && currentTime < start) return false;
        if (end && currentTime > end) return false;
      }
      
      return true;
    });
  }

  private applySinglePromotion(cart: CartItem[], promo: Promotion): CartItem[] {
    const rules = promo.rules as any;
    if (!rules) return cart;

    // Clone cart to avoid mutation issues during iteration
    let newCart = cart.map(item => ({ ...item }));

    if (promo.type === 'bogo') {
      // BOGO: Buy X of Product A, Get Y of Product A for Z% off
      const targetProductId = rules.product_id;
      const buyQty = rules.buy_qty || 1;
      const getQty = rules.get_qty || 1;
      const discountPercent = rules.discount_percent || 100;

      // Filter items: match product and check target_variants
      const items = newCart.filter(item => {
        if (item.appliedPromotionId) return false;
        if (item.product.id !== targetProductId) return false;
        if (promo.target_variants && promo.target_variants.length > 0) {
          return promo.target_variants.includes(item.product.id);
        }
        return true;
      });
      
      let totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
      const dealSize = buyQty + getQty;
      const numDeals = Math.floor(totalQty / dealSize);
      
      if (numDeals > 0) {
        let itemsToDiscount = numDeals * getQty;
        
        for (const item of items) {
          if (itemsToDiscount <= 0) break;
          
          const qtyInItem = item.quantity;
          const discountableInThisItem = Math.min(qtyInItem, itemsToDiscount);
          
          const unitPrice = item.priceOverride ?? item.product.sale_price;
          const discountAmount = (unitPrice * discountableInThisItem) * (discountPercent / 100);
          
          item.discount = (item.discount || 0) + discountAmount;
          item.subtotal = (item.quantity * unitPrice) - item.discount;
          item.appliedPromotionId = promo.id;
          
          itemsToDiscount -= discountableInThisItem;
        }
      }
    } else if (promo.type === 'discount_percent') {
      // Percentage discount on specific products or all products
      const discountPercent = rules.discount_percent || 0;
      
      for (const item of newCart) {
        if (item.appliedPromotionId) continue;
        
        // Check if item is in target variants or apply to all
        if (promo.target_variants && promo.target_variants.length > 0) {
          if (!promo.target_variants.includes(item.product.id)) continue;
        }
        
        const unitPrice = item.priceOverride ?? item.product.sale_price;
        const discountAmount = (unitPrice * item.quantity) * (discountPercent / 100);
        
        item.discount = (item.discount || 0) + discountAmount;
        item.subtotal = (item.quantity * unitPrice) - item.discount;
        item.appliedPromotionId = promo.id;
      }
    } else if (promo.type === 'fixed_amount') {
      // Fixed amount off per item or total cart
      const fixedAmount = rules.fixed_amount || 0;
      
      for (const item of newCart) {
        if (item.appliedPromotionId) continue;
        
        // Check if item is in target variants or apply to all
        if (promo.target_variants && promo.target_variants.length > 0) {
          if (!promo.target_variants.includes(item.product.id)) continue;
        }
        
        const unitPrice = item.priceOverride ?? item.product.sale_price;
        const discountAmount = Math.min(fixedAmount * item.quantity, unitPrice * item.quantity);
        
        item.discount = (item.discount || 0) + discountAmount;
        item.subtotal = (item.quantity * unitPrice) - item.discount;
        item.appliedPromotionId = promo.id;
      }
    } else if (promo.type === 'happy_hour') {
      // Same as discount_percent but typically time-restricted
      const discountPercent = rules.discount_percent || 0;
      
      for (const item of newCart) {
        if (item.appliedPromotionId) continue;
        
        if (promo.target_variants && promo.target_variants.length > 0) {
          if (!promo.target_variants.includes(item.product.id)) continue;
        }
        
        const unitPrice = item.priceOverride ?? item.product.sale_price;
        const discountAmount = (unitPrice * item.quantity) * (discountPercent / 100);
        
        item.discount = (item.discount || 0) + discountAmount;
        item.subtotal = (item.quantity * unitPrice) - item.discount;
        item.appliedPromotionId = promo.id;
      }
    }

    return newCart;
  }
}
