import { create } from 'zustand';
import { Product, PaymentMethod, ParkedSale, CartItem, Customer } from '../types';
import { generateId } from '../utils';
import { db } from '../database/dexieDb';
import { MarketService } from '../services/MarketService';

const marketService = new MarketService();

interface CartStore {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  customer: Customer | null;
  
  // Actions
  addToCart: (product: Product, quantity?: number, options?: { isPayItForward?: boolean, redeemedFromPifId?: string, priceOverride?: number }) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCustomer: (customer: Customer | null) => void;
  parkOrder: (note?: string) => Promise<void>;
  restoreOrder: (parkedSale: ParkedSale) => Promise<void>;
  
  // Computed
  getTotal: () => number;
  getItemCount: () => number;
  getTax: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  paymentMethod: 'cash',
  customer: null,
  
  addToCart: async (product: Product, quantity: number = 1, options: { isPayItForward?: boolean, redeemedFromPifId?: string, priceOverride?: number } = {}) => {
    try {
      const currentItems = get().items;
      const { isPayItForward, redeemedFromPifId, priceOverride } = options;
      
      // Only merge if no special options are set
      const shouldMerge = !isPayItForward && !redeemedFromPifId && priceOverride === undefined;
      
      const existingItem = shouldMerge 
        ? currentItems.find(item => item.product.id === product.id && !item.isPayItForward && !item.redeemedFromPifId && item.priceOverride === undefined)
        : undefined;
      
      const price = priceOverride !== undefined ? priceOverride : product.sale_price;
      
      let newItems = [...currentItems];

      if (existingItem) {
        // Update quantity
        newItems = currentItems.map(item =>
          item.id === existingItem.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                subtotal: (item.quantity + quantity) * price,
              }
            : item
        );
      } else {
        // Add new item
        const newItem: CartItem = {
          id: generateId(),
          product,
          quantity,
          subtotal: quantity * price,
          isPayItForward,
          redeemedFromPifId,
          priceOverride
        };
        
        newItems = [...currentItems, newItem];
      }

      // Apply promotions
      try {
        const promotedItems = await marketService.applyPromotions(newItems);
        set({ items: promotedItems });
      } catch (promoError) {
        console.error('Error applying promotions:', promoError);
        // Fall back to items without promotions
        set({ items: newItems });
      }
      
      // Play sound effect (if in Electron context)
      if (typeof window !== 'undefined' && 'electronAPI' in window) {
        // @ts-ignore
        window.electronAPI?.playSound?.('beep');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  },
  
  removeFromCart: async (cartItemId: string) => {
    try {
      const newItems = get().items.filter(item => item.id !== cartItemId);
      try {
        const promotedItems = await marketService.applyPromotions(newItems);
        set({ items: promotedItems });
      } catch (promoError) {
        console.error('Error applying promotions after remove:', promoError);
        set({ items: newItems });
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  },
  
  updateQuantity: async (cartItemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await get().removeFromCart(cartItemId);
        return;
      }
      
      const newItems = get().items.map(item => {
        if (item.id === cartItemId) {
          const price = item.priceOverride !== undefined ? item.priceOverride : item.product.sale_price;
          return {
            ...item,
            quantity,
            subtotal: quantity * price,
          };
        }
        return item;
      });

      try {
        const promotedItems = await marketService.applyPromotions(newItems);
        set({ items: promotedItems });
      } catch (promoError) {
        console.error('Error applying promotions after quantity update:', promoError);
        set({ items: newItems });
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  },
  
  clearCart: () => {
    set({ items: [], paymentMethod: 'cash', customer: null });
  },
  
  setPaymentMethod: (method: PaymentMethod) => {
    set({ paymentMethod: method });
  },

  setCustomer: (customer: Customer | null) => {
    set({ customer });
  },
  
  parkOrder: async (note?: string) => {
    const { items } = get();
    if (items.length === 0) return;
    
    const parkedSale: ParkedSale = {
      id: generateId(),
      items,
      parked_at: new Date().toISOString(),
      note
    };
    
    await db.parked_sales.add(parkedSale);
    get().clearCart();
  },
  
  restoreOrder: async (parkedSale: ParkedSale) => {
    // Apply promotions again when restoring, just in case rules changed
    const promotedItems = await marketService.applyPromotions(parkedSale.items);
    set({ items: promotedItems });
    await db.parked_sales.delete(parkedSale.id);
  },
  
  getTotal: () => {
    return get().items.reduce((total, item) => total + item.subtotal, 0);
  },
  
  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0);
  },
  
  getTax: () => {
    // Simple 20% tax calculation for now
    return get().getTotal() * 0.2;
  }
}));
