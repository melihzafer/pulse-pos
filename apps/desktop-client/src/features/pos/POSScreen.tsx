import React, { useEffect, useState } from 'react';
import { ProductGrid } from './ProductGrid';
import { Cart } from './Cart';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { ShiftModal } from './ShiftModal';
import { CustomerModal } from './CustomerModal';
import { SellGiftCardModal } from './SellGiftCardModal';
import { CustomerProfileScreen } from '../customers/CustomerProfileScreen';

import { useCartStore, useAuthStore, Product, PaymentMethod, MarketService, formatCurrency, LoyaltyService } from '@pulse/core-logic';
import { useTranslation } from 'react-i18next';
import { useRxCollection, useRxDB } from 'rxdb-hooks';
import { toast } from 'sonner';
import { Monitor, Lock, Settings, Gift } from 'lucide-react';
import { sendNotification } from '../../utils/notifications';
import { ConnectionStatus } from '../../components/common/ConnectionStatus';
import { ShortcutsHelpModal } from './ShortcutsHelpModal';
import { useSettingsStore } from '../settings/store';

const marketService = new MarketService();

interface POSScreenProps {
  onNavigate?: (tab: string) => void;
}

export const POSScreen: React.FC<POSScreenProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { workspaceId } = useSettingsStore();
  const db = useRxDB();
  const productsCollection = useRxCollection<Product>('products');
  const salesCollection = useRxCollection('sales');
  
  const { addToCart, clearCart, getTotal, items, customer } = useCartStore();
  const { currentCashier } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isGiftCardModalOpen, setIsGiftCardModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState(0);
  const [lastTotal, setLastTotal] = useState(0);
  const [lastSaleId, setLastSaleId] = useState<string | undefined>(undefined);
  const [lastSaleItems, setLastSaleItems] = useState<typeof items>([]);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<PaymentMethod>('cash');
  const [enableShifts, setEnableShifts] = useState(true);

  // ... (Settings and effect logic remains the same)
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

  const loadProducts = async () => {
    if (!productsCollection) return;
    try {
      const allProducts = await productsCollection.find({
        selector: {
          workspace_id: workspaceId
        }
      }).exec();
      setProducts(allProducts.map(doc => doc.toJSON()) as Product[]);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productsCollection) {
        loadProducts();
        const sub = productsCollection.$.subscribe(() => {
            loadProducts();
        });
        return () => sub.unsubscribe();
    }
  }, [productsCollection, workspaceId]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        if (items.length > 0) {
          setIsPaymentModalOpen(true);
        }
      }

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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        setIsHelpModalOpen(true);
        return;
      }

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
         e.preventDefault();
         setIsHelpModalOpen(true);
         return;
      }

      if (e.key === 'F5') {
        e.preventDefault();
        if (items.length > 0) {
          setIsPaymentModalOpen(true);
        }
        return;
      }

      if (e.key === 'F6') {
        e.preventDefault();
        if (items.length > 0) {
          const note = window.prompt(t('cart.parkNote'));
          // @ts-ignore - parkOrder is in useCartStore, ignore tsc complaint for now if any
          useCartStore.getState().parkOrder(note || undefined);
          toast.success(t('cart.parkSuccess'));
        }
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = '';
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

  // Broadcast cart changes
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

  const handleProductClick = async (product: Product) => {
    try {
      await addToCart(product, 1);
    } catch (error) {
      console.error('Failed to add product to cart:', error);
      toast.error(t('cart.addError', 'Failed to add product to cart'));
    }
  };

  const handleGiftCardSold = (amount: number, cardNumber: string) => {
    const giftCardProduct: Product = {
      id: `giftcard-${cardNumber}`,
      workspace_id: workspaceId,
      name: `Gift Card - ${cardNumber}`,
      barcode: cardNumber,
      sku: cardNumber,
      sale_price: amount,
      cost_price: 0,
      stock_quantity: 1,
      min_stock_level: 0,
      is_quick_key: false,
      age_restricted: false,
    };

    addToCart(giftCardProduct, 1);
    toast.success(t('giftCard.addedToCart', { defaultValue: 'Gift card added to cart' }));
  };

  const handlePaymentComplete = async (method: PaymentMethod, amountTendered: number, change: number, payments?: { method: PaymentMethod, amount: number }[]) => {
    try {
      console.log('Processing payment:', { method, amountTendered, change, payments });
      
      const currentTotal = getTotal();
      setLastTotal(currentTotal);
      setLastChange(change);

      const settingsStr = localStorage.getItem('pulse-settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {};
      const highValueThreshold = settings.notifications?.highValueThreshold || 1000;

      if (currentTotal > highValueThreshold) {
        sendNotification({
          title: t('notifications.highValueSale', 'High Value Sale'),
          message: t('notifications.highValueMessage', 'Sale amount: {{amount}}', { amount: formatCurrency(currentTotal) }),
          type: 'info',
          category: 'highValueSale'
        });
      }

      const channel = new BroadcastChannel('customer-display');
      channel.postMessage({
        type: 'PAYMENT_COMPLETE',
        payload: {
          change: change,
          total: currentTotal,
        },
      });
      channel.close();

      const sale = {
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        total_amount: currentTotal,
        payment_method: method,
        payments: payments,
        status: 'completed' as const,
        created_at: new Date().toISOString(),
        customer_id: customer?.id,
        items: items.map(item => ({
          id: crypto.randomUUID(),
          sale_id: '',
          product_id: item.product.id,
          product_name_snapshot: item.product.name,
          cost_snapshot: item.product.cost_price,
          price_snapshot: item.product.sale_price,
          quantity: item.quantity,
          discount: item.discount,
        })),
      };

      let saleId = '';
      if (salesCollection) {
          const doc = await salesCollection.insert(sale);
          saleId = doc.id;
      }
      setLastSaleId(saleId);

      if (sale.customer_id) {
        try {
          await LoyaltyService.processSale(sale);
        } catch (error) {
          console.error('Loyalty processing failed:', error);
        }
      }
      
      if (productsCollection) {
        for (const item of items) {
            const productDoc = await productsCollection.findOne(item.product.id).exec();
            if (productDoc) {
            const currentQty = productDoc.get('stock_quantity') as number;
            const newQuantity = currentQty - item.quantity;
            
            await productDoc.patch({
                stock_quantity: newQuantity
            });

            const lowStockThreshold = settings.notifications?.lowStockThreshold || 5;
            if (newQuantity <= lowStockThreshold) {
                sendNotification({
                title: t('notifications.lowStock', 'Low Stock Alert'),
                message: t('notifications.lowStockMessage', 'Product {{product}} is low on stock ({{quantity}})', { product: productDoc.get('name'), quantity: newQuantity }),
                type: 'warning',
                category: 'lowStock'
                });
            }
            }
        }
      }

      setLastSaleItems([...items]);
      setLastPaymentMethod(method);
      
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
      <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (viewingCustomerId) {
    return (
      <CustomerProfileScreen
        customerId={viewingCustomerId}
        onBack={() => setViewingCustomerId(null)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-orange-50/10 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20 overflow-hidden">
      {/* Left Side: Product Grid */}
      <div className="flex-1 flex flex-col min-w-0 max-w-[calc(100%-480px)]">
        {/* Header Bar - Glass Effect */}
        <div className="h-16 glass-panel border-b-0 m-4 mb-2 rounded-2xl flex items-center justify-between px-6 shrink-0 z-20">
          {/* Cashier Info */}
          {currentCashier && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center text-white font-bold text-lg">
                {currentCashier.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white leading-tight">{currentCashier.full_name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    {t(`cashiers.role.${currentCashier.role}`, currentCashier.role)}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3 items-center">
            <ConnectionStatus />
            <button
              onClick={() => setIsGiftCardModalOpen(true)}
              className="p-2.5 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400 flex items-center gap-2 transition-colors border border-transparent hover:border-purple-200 dark:hover:border-purple-800/50"
              title={t('giftCard.sell', 'Sell Gift Card')}
            >
              <Gift size={20} />
              <span className="text-sm font-semibold hidden sm:inline">{t('giftCard.sell', 'Gift Card')}</span>
            </button>
            <button
              onClick={openCustomerDisplay}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl text-slate-600 dark:text-slate-300 flex items-center gap-2 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
              title={t('customerDisplay.display')}
            >
              <Monitor size={20} />
              <span className="text-sm font-semibold hidden sm:inline">{t('customerDisplay.display')}</span>
            </button>
            {enableShifts && (
              <button
                onClick={() => setIsShiftModalOpen(true)}
                className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl text-slate-600 dark:text-slate-300 flex items-center gap-2 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                title={t('shift.management')}
              >
                <Lock size={20} />
                <span className="text-sm font-semibold hidden sm:inline">{t('shift.management')}</span>
              </button>
            )}
            <button
              onClick={() => onNavigate?.('settings')}
              className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl text-slate-600 dark:text-slate-300 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
              title={t('settings.title')}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 pt-2 overflow-hidden px-4 pb-4">
          <div className="h-full glass-panel rounded-2xl overflow-hidden p-6 shadow-xl">
             <ProductGrid 
              products={products} 
              onProductClick={handleProductClick}
              onProductsChange={loadProducts}
            />
          </div>
        </div>
      </div>

      {/* Right Side: Cart - Glass Panel */}
      <div className="w-[480px] top-0 right-0 h-full p-4 pl-0">
        <div className="h-full glass-panel rounded-2xl shadow-2xl flex flex-col border-l-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md -z-10"></div>
          <Cart 
            onPay={() => setIsPaymentModalOpen(true)} 
            products={products}
            onViewCustomerProfile={(customerId) => setViewingCustomerId(customerId)}
          />
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
        items={lastSaleItems}
        saleId={lastSaleId}
        paymentMethod={lastPaymentMethod}
        cashierName={currentCashier?.full_name}
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
        onViewProfile={(customerId) => setViewingCustomerId(customerId)}
      />

      <SellGiftCardModal
        isOpen={isGiftCardModalOpen}
        onClose={() => setIsGiftCardModalOpen(false)}
        onSold={handleGiftCardSold}
      />
      <ShortcutsHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
};
