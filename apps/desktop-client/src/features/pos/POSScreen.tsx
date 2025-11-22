import React, { useEffect, useState } from 'react';
import { ProductGrid } from './ProductGrid';
import { Cart } from './Cart';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { ShiftModal } from './ShiftModal';
import { CustomerModal } from './CustomerModal';
import { useCartStore, Product, db, PaymentMethod, MarketService } from '@pulse/core-logic';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Settings, Lock, Monitor } from 'lucide-react';

const marketService = new MarketService();

interface POSScreenProps {
  onNavigate?: (tab: string) => void;
}

export const POSScreen: React.FC<POSScreenProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { addToCart, clearCart, getTotal, items, customer } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [lastChange, setLastChange] = useState(0);
  const [lastTotal, setLastTotal] = useState(0);
  const [enableShifts, setEnableShifts] = useState(true);

  useEffect(() => {
    const loadSettings = () => {
      const savedSettings = localStorage.getItem('pulse-settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.enableShifts !== undefined) {
            setEnableShifts(parsed.enableShifts);
          }
        } catch (e) {
          console.error('Failed to load settings:', e);
        }
      }
    };

    loadSettings();

    const handleSettingsChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.enableShifts !== undefined) {
        setEnableShifts(customEvent.detail.enableShifts);
      } else {
        loadSettings();
      }
    };

    window.addEventListener('pulse-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('pulse-settings-changed', handleSettingsChange);
  }, []);

  // Load products from Dexie
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const allProducts = await db.products.toArray();
        setProducts(allProducts);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F5 for Pay (handled in Cart component, but we can add logic here too)
      if (e.key === 'F5') {
        e.preventDefault();
        if (items.length > 0) {
          setIsPaymentModalOpen(true);
        }
      }

      // Escape to clear cart
      if (e.key === 'Escape' && !isPaymentModalOpen && !isReceiptModalOpen) {
        const confirmClear = window.confirm(t('cart.clearConfirm'));
        if (confirmClear) {
          clearCart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearCart, t, items.length, isPaymentModalOpen, isReceiptModalOpen]);

  // Handle keyboard shortcuts and barcode scanner
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // F1 to focus search
      if (e.key === 'F1') {
        e.preventDefault();
        document.getElementById('product-search')?.focus();
        return;
      }

      // F5 to pay
      if (e.key === 'F5') {
        e.preventDefault();
        if (items.length > 0) {
          setIsPaymentModalOpen(true);
        }
        return;
      }

      // Barcode scanner buffer handling
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = ''; // Reset buffer if too much time passed (manual typing vs scanner)
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          try {
            const result = await marketService.findProduct(buffer);
            
            if (result) {
              await addToCart(result.product, result.quantity, { priceOverride: result.priceOverride });
              
              if (result.isScaleItem) {
                toast.success(`${result.product.name} (${result.quantity} ${result.product.sale_price ? 'kg' : 'units'})`);
              } else if (result.quantity > 1) {
                toast.success(`${result.product.name} (x${result.quantity})`);
              } else {
                toast.success(t('pos.addedToCart'));
              }
            } else {
              toast.error(t('pos.productNotFound'));
            }
          } catch (error) {
            console.error('Error finding product:', error);
            toast.error(t('pos.productNotFound'));
          }
        }
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [items.length, addToCart, t]);

  // Broadcast cart changes to customer display
  useEffect(() => {
    const channel = new BroadcastChannel('customer-display');
    
    const broadcastCart = () => {
      channel.postMessage({
        type: 'CART_UPDATE',
        payload: {
          items: items,
          total: getTotal(),
        },
      });
    };

    broadcastCart();

    return () => channel.close();
  }, [items, getTotal]);

  const handleProductClick = (product: Product) => {
    addToCart(product, 1);
  };

  const handlePaymentComplete = async (method: PaymentMethod, amountTendered: number, change: number, payments?: { method: PaymentMethod, amount: number }[]) => {
    try {
      console.log('Processing payment:', { method, amountTendered, change, payments });
      
      const currentTotal = getTotal();
      setLastTotal(currentTotal);
      setLastChange(change);

      // Broadcast payment success
      const channel = new BroadcastChannel('customer-display');
      channel.postMessage({
        type: 'PAYMENT_COMPLETE',
        payload: {
          change: change,
          total: currentTotal,
        },
      });
      channel.close();

      // Create sale record
      const sale = {
        id: crypto.randomUUID(),
        workspace_id: '00000000-0000-0000-0000-000000000000', // TODO: Get from settings
        total_amount: currentTotal,
        payment_method: method,
        payments: payments, // Store split payments if any
        status: 'completed' as const,
        created_at: new Date().toISOString(),
        customer_id: customer?.id, // Link sale to customer
        items: items.map(item => ({
          id: crypto.randomUUID(),
          sale_id: '', // Will be set by DB or ignored if not relational
          product_id: item.product.id,
          product_name_snapshot: item.product.name,
          cost_snapshot: item.product.cost_price,
          price_snapshot: item.product.sale_price,
          quantity: item.quantity,
        })),
      };

      // Save to Dexie
      await db.sales.add(sale);
      
      // Update stock
      for (const item of items) {
        const product = await db.products.get(item.product.id);
        if (product) {
          await db.products.update(item.product.id, {
            stock_quantity: product.stock_quantity - item.quantity
          });
        }
      }

      toast.success(t('payment.success'));
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
      clearCart();
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error(t('payment.error'));
    }
  };

  const openCustomerDisplay = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'customer-display');
    window.open(url.toString(), 'CustomerDisplay', 'width=800,height=600,menubar=no,toolbar=no');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-blue-600 dark:text-blue-400 text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-900 overflow-hidden">
      {/* Left Side: Product Grid */}
      <div className="flex-1 flex flex-col min-w-0 max-w-[calc(100%-450px)]">
        {/* Header Bar */}
        <div className="h-14 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-4 shrink-0">
          {/* <h1 className="text-xl font-bold text-gray-800 dark:text-white">Pulse POS</h1> */}
          <div className="flex gap-2">
            <button
              onClick={openCustomerDisplay}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-600 dark:text-slate-300 flex items-center gap-2"
              title="Open Customer Display"
            >
              <Monitor size={20} />
              <span className="text-sm font-medium hidden sm:inline">Display</span>
            </button>
            {enableShifts && (
              <button
                onClick={() => setIsShiftModalOpen(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-600 dark:text-slate-300 flex items-center gap-2"
                title={t('shift.management')}
              >
                <Lock size={20} />
                <span className="text-sm font-medium hidden sm:inline">{t('shift.management')}</span>
              </button>
            )}
            <button
              onClick={() => onNavigate?.('settings')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-600 dark:text-slate-300"
              title={t('settings.title')}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-hidden px-12">
          <ProductGrid products={products} onProductClick={handleProductClick} />
        </div>
      </div>

      {/* Right Side: Cart */}
      <div className="w-[500px] top-0 right-0 fixed bg-white h-[100vh] dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 flex flex-col shadow-xl z-10">
        <div className="flex-1 p-4 overflow-hidden">
          <Cart onPay={() => setIsPaymentModalOpen(true)} products={products} />
        </div>
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        total={getTotal()}
        onComplete={handlePaymentComplete}
      />

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        change={lastChange}
        total={lastTotal}
        items={items}
        onPrint={() => toast.success(t('receipt.printing'))}
        onEmail={(email) => toast.success(t('receipt.emailSent', { email }))}
      />

      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
      />

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
      />
    </div>
  );
};
