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
    try {
      const activePromotions = await db.promotions
        .filter(p => p.is_active === true || p.is_active === 1)
        .toArray();

      console.log('[MarketService] Found active promotions:', activePromotions.length);

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

      console.log('[MarketService] Valid promotions after filtering:', validPromotions.length);

      // Calculate cart subtotal for min purchase check
      const cartSubtotal = cartItems.reduce((sum, item) => {
        const unitPrice = item.priceOverride ?? item.product.sale_price;
        return sum + (unitPrice * item.quantity);
      }, 0);

      console.log('[MarketService] Cart subtotal:', cartSubtotal);

      // Filter by minimum purchase amount
      const applicablePromotions = validPromotions.filter(p => {
        if (p.min_purchase_amount && cartSubtotal < p.min_purchase_amount) return false;
        return true;
      });

      console.log('[MarketService] Applicable promotions:', applicablePromotions.length);

      // Sort by priority (descending)
      applicablePromotions.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      // Clear existing promotions before re-applying (critical for cart updates)
      let updatedCart = cartItems.map(item => ({
        ...item,
        discount: 0,
        appliedPromotionId: undefined
      }));

      for (const promo of applicablePromotions) {
        console.log('[MarketService] Applying promotion:', promo.name, promo.type);
        updatedCart = this.applySinglePromotion(updatedCart, promo);
      }

      console.log('[MarketService] Final cart with discounts:', updatedCart.map(i => ({ 
        name: i.product.name, 
        discount: i.discount, 
        promoId: i.appliedPromotionId 
      })));

      return updatedCart;
    } catch (error) {
      console.error('[MarketService] Error in applyPromotions:', error);
      // Return cart unchanged if promotion application fails
      return cartItems;
    }
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
    try {
      const rules = promo.rules as any;
      if (!rules) {
        console.warn('[MarketService] Promotion has no rules:', promo.name);
        return cart;
      }

      // Deep clone cart to avoid mutation issues during iteration
      let newCart = cart.map(item => ({
        ...item,
        product: { ...item.product },
        discount: item.discount || 0,
        appliedPromotionId: item.appliedPromotionId
      }));

      console.log('[MarketService] Applying', promo.type, 'promotion:', promo.name, {
        rules,
        target_variants: promo.target_variants
      });

      if (promo.type === 'bogo') {
        // BOGO: Buy X of Product A, Get Y of Product A for Z% off
        const targetProductId = rules.product_id;
        const buyQty = rules.buy_qty || 1;
        const getQty = rules.get_qty || 1;
        const discountPercent = rules.discount_percent || 100;

        // Filter items: match product by ID or target_variants
        const items = newCart.filter(item => {
          // Don't reapply to already promoted items from this same promotion
          if (item.appliedPromotionId === promo.id) return false;
          
          // Check if product matches by target_variants OR product_id
          const matchesByVariants = promo.target_variants && promo.target_variants.length > 0 
            && promo.target_variants.includes(item.product.id);
          const matchesById = targetProductId && item.product.id === targetProductId;
          
          return matchesByVariants || matchesById;
        });
        
        console.log('[MarketService] BOGO matched items:', items.length, items.map(i => i.product.name));
        
        let totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
        const dealSize = buyQty + getQty;
        const numDeals = Math.floor(totalQty / dealSize);
        
        console.log('[MarketService] BOGO calc:', { totalQty, dealSize, numDeals, buyQty, getQty });
        
        if (numDeals > 0) {
          let itemsToDiscount = numDeals * getQty;
          
          for (const item of items) {
            if (itemsToDiscount <= 0) break;
            
            const qtyInItem = item.quantity;
            const discountableInThisItem = Math.min(qtyInItem, itemsToDiscount);
            
            const unitPrice = item.priceOverride ?? item.product.sale_price;
            
            // Validate unit price
            if (typeof unitPrice !== 'number' || isNaN(unitPrice) || unitPrice < 0) {
              console.error('[MarketService] Invalid unit price:', unitPrice, 'for product:', item.product.name);
              continue;
            }
            
            const discountAmount = (unitPrice * discountableInThisItem) * (discountPercent / 100);
            
            console.log('[MarketService] Applying discount to', item.product.name, {
              unitPrice,
              discountableInThisItem,
              discountPercent,
              discountAmount
            });
            
            item.discount = (item.discount || 0) + discountAmount;
            item.subtotal = (item.quantity * unitPrice) - item.discount;
            
            // Validate subtotal
            if (typeof item.subtotal !== 'number' || isNaN(item.subtotal)) {
              console.error('[MarketService] Invalid subtotal calculated:', item.subtotal);
              item.subtotal = item.quantity * unitPrice; // Fallback to no discount
              item.discount = 0;
              continue;
            }
            
            item.appliedPromotionId = promo.id;
            
            itemsToDiscount -= discountableInThisItem;
          }
        }
      } else if (promo.type === 'discount_percent') {
        // Percentage discount on specific products or all products
        const discountPercent = rules.discount_percent || 0;
        
        // Validate discount percent
        if (typeof discountPercent !== 'number' || isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
          console.error('[MarketService] Invalid discount percent:', discountPercent);
          return newCart;
        }
        
        let matchedCount = 0;
        for (const item of newCart) {
          // Don't reapply to already promoted items from this same promotion
          if (item.appliedPromotionId === promo.id) continue;
          
          // Check if item is in target variants or apply to all
          if (promo.target_variants && promo.target_variants.length > 0) {
            if (!promo.target_variants.includes(item.product.id)) continue;
          }
          
          const unitPrice = item.priceOverride ?? item.product.sale_price;
          
          // Validate unit price
          if (typeof unitPrice !== 'number' || isNaN(unitPrice) || unitPrice < 0) {
            console.error('[MarketService] Invalid unit price:', unitPrice);
            continue;
          }
          
          const discountAmount = (unitPrice * item.quantity) * (discountPercent / 100);
          
          item.discount = (item.discount || 0) + discountAmount;
          item.subtotal = (item.quantity * unitPrice) - item.discount;
          
          // Validate subtotal
          if (typeof item.subtotal !== 'number' || isNaN(item.subtotal)) {
            console.error('[MarketService] Invalid subtotal:', item.subtotal);
            item.subtotal = item.quantity * unitPrice;
            item.discount = 0;
            continue;
          }
          
          item.appliedPromotionId = promo.id;
          matchedCount++;
        }
        
        console.log('[MarketService] Discount applied to', matchedCount, 'items');
      } else if (promo.type === 'fixed_amount') {
        // Fixed amount off per item or total cart
        const fixedAmount = rules.fixed_amount || 0;
        
        // Validate fixed amount
        if (typeof fixedAmount !== 'number' || isNaN(fixedAmount) || fixedAmount < 0) {
          console.error('[MarketService] Invalid fixed amount:', fixedAmount);
          return newCart;
        }
        
        let matchedCount = 0;
        for (const item of newCart) {
          // Don't reapply to already promoted items from this same promotion
          if (item.appliedPromotionId === promo.id) continue;
          
          // Check if item is in target variants or apply to all
          if (promo.target_variants && promo.target_variants.length > 0) {
            if (!promo.target_variants.includes(item.product.id)) continue;
          }
          
          const unitPrice = item.priceOverride ?? item.product.sale_price;
          
          // Validate unit price
          if (typeof unitPrice !== 'number' || isNaN(unitPrice) || unitPrice < 0) {
            console.error('[MarketService] Invalid unit price:', unitPrice);
            continue;
          }
          
          const discountAmount = Math.min(fixedAmount * item.quantity, unitPrice * item.quantity);
          
          item.discount = (item.discount || 0) + discountAmount;
          item.subtotal = (item.quantity * unitPrice) - item.discount;
          
          // Validate subtotal
          if (typeof item.subtotal !== 'number' || isNaN(item.subtotal)) {
            console.error('[MarketService] Invalid subtotal:', item.subtotal);
            item.subtotal = item.quantity * unitPrice;
            item.discount = 0;
            continue;
          }
          
          item.appliedPromotionId = promo.id;
          matchedCount++;
        }
        
        console.log('[MarketService] Fixed discount applied to', matchedCount, 'items');
      } else if (promo.type === 'happy_hour') {
        // Same as discount_percent but typically time-restricted
        const discountPercent = rules.discount_percent || 0;
        
        let matchedCount = 0;
        for (const item of newCart) {
          // Don't reapply to already promoted items from this same promotion
          if (item.appliedPromotionId === promo.id) continue;
          
          if (promo.target_variants && promo.target_variants.length > 0) {
            if (!promo.target_variants.includes(item.product.id)) continue;
          }
          
          const unitPrice = item.priceOverride ?? item.product.sale_price;
          const discountAmount = (unitPrice * item.quantity) * (discountPercent / 100);
          
          item.discount = (item.discount || 0) + discountAmount;
          item.subtotal = (item.quantity * unitPrice) - item.discount;
          item.appliedPromotionId = promo.id;
          matchedCount++;
        }
        
        console.log('[MarketService] Happy hour applied to', matchedCount, 'items');
      }

      return newCart;
    } catch (error) {
      console.error('[MarketService] Error in applySinglePromotion:', promo.name, error);
      return cart;
    }
  }
}
