import React, { useState, useMemo } from 'react';
import { Plus, Minus, Trash2, Clock, PauseCircle, User, Sparkles, Heart, Tag, Eye } from 'lucide-react';
import { useCartStore, formatCurrency, ParkedSale, Product, getUpsellProducts } from '@pulse/core-logic';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { ParkedSalesModal } from './ParkedSalesModal';
import { CustomerModal } from './CustomerModal';
import { PayItForwardModal } from './PayItForwardModal';

interface CartProps {
  onPay?: () => void;
  products: Product[];
  onViewCustomerProfile?: (customerId: string) => void;
}

export const Cart: React.FC<CartProps> = ({ onPay, products, onViewCustomerProfile }) => {
  const { t } = useTranslation();
  const { items, removeFromCart, updateQuantity, clearCart, getTotal, getItemCount, parkOrder, restoreOrder, customer, addToCart } = useCartStore();
  const [showParkedSales, setShowParkedSales] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPifModal, setShowPifModal] = useState(false);

  const total = getTotal();
  const itemCount = getItemCount();

  const upsellSuggestions = useMemo(() => {
    return getUpsellProducts(items, products);
  }, [items, products]);

  const handlePark = async () => {
    await parkOrder();
  };

  const handleRestore = async (sale: ParkedSale) => {
    await restoreOrder(sale);
    setShowParkedSales(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 dark:from-white dark:to-blue-100 bg-clip-text text-transparent">
          {t('cart.title')} ({itemCount} {itemCount === 1 ? t('cart.item_one') : t('cart.item_other')})
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPifModal(true)}
            className="text-sm text-pink-500 hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-300 transition-colors flex items-center gap-1"
            title={t('pif.title', 'Pay It Forward')}
          >
            <Heart size={18} />
          </button>
          <button
            onClick={() => setShowCustomerModal(true)}
            className={clsx(
              "text-sm transition-colors flex items-center gap-1",
              customer ? "text-green-600 dark:text-green-400" : "text-gray-500 hover:text-gray-600 dark:text-slate-400"
            )}
            title={customer ? customer.name : t('customer.select')}
          >
            <User size={18} />
            {customer && <span className="max-w-[80px] truncate">{customer.name}</span>}
          </button>
          {customer && onViewCustomerProfile && (
            <button
              onClick={() => onViewCustomerProfile(customer.id)}
              className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              title={t('customer.viewProfile', 'View Profile')}
            >
              <Eye size={18} />
            </button>
          )}
          <button
            onClick={() => setShowParkedSales(true)}
            className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
            title={t('pos.parkedSales')}
          >
            <Clock size={18} />
          </button>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors flex items-center gap-1"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 dark:text-slate-500">{t('cart.empty')}</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="glass-panel p-4 rounded-xl hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{item.product.name}</h3>
                  {item.appliedPromotionId && item.discount && item.discount > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Tag size={14} className="text-green-500" />
                      <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                        {t('cart.promoApplied', 'Promo Applied')}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 transition-all ml-2 p-1 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-700 dark:text-white"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-mono font-bold text-gray-900 dark:text-white w-12 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-700 dark:text-white"
                    disabled={item.quantity >= item.product.stock_quantity}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {formatCurrency(item.product.sale_price)} × {item.quantity}
                  </p>
                  {item.discount && item.discount > 0 && (
                    <p className="text-xs text-red-500 font-medium">
                      -{formatCurrency(item.discount)}
                    </p>
                  )}
                  <p className="font-mono font-bold text-blue-600 dark:text-blue-400">{formatCurrency(item.subtotal)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upsell Suggestions */}
      {upsellSuggestions.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-300">
            <Sparkles size={16} />
            <span className="text-sm font-semibold">{t('cart.suggestions')}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {upsellSuggestions.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product, 1)}
                className="flex-shrink-0 flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-blue-100 dark:border-blue-800 hover:shadow-md transition-all text-left"
              >
                <div className="w-8 h-8 bg-gray-100 dark:bg-slate-700 rounded-md flex items-center justify-center text-xs">
                  {product.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-900 dark:text-white truncate max-w-[80px]">
                    {product.name}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                    {formatCurrency(product.sale_price)}
                  </div>
                </div>
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Plus size={14} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Total & Pay Button */}
      <div className="glass-panel p-4 rounded-xl">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 dark:border-slate-700">
          <span className="text-lg text-gray-600 dark:text-slate-300 font-medium">{t('cart.total')}</span>
          <span className="text-2xl font-mono font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">{formatCurrency(total)}</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            disabled={items.length === 0}
            onClick={handlePark}
            className={clsx(
              "col-span-1 py-4 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center",
              items.length === 0
                ? "bg-gray-200 text-gray-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
                : "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600"
            )}
            title={t('pos.parkOrder')}
          >
            <PauseCircle size={24} />
          </button>
          <button
            disabled={items.length === 0}
            onClick={onPay}
            className={clsx(
              "col-span-3 py-4 rounded-xl font-bold text-lg transition-all duration-200",
              items.length === 0
                ? "bg-gray-300 text-gray-500 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
                : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-2xl hover:scale-[1.02]"
            )}
          >
            {t('cart.pay')} {formatCurrency(total)}
          </button>
        </div>
      </div>

      <ParkedSalesModal
        isOpen={showParkedSales}
        onClose={() => setShowParkedSales(false)}
        onRestore={handleRestore}
      />

      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
      />

      <PayItForwardModal
        isOpen={showPifModal}
        onClose={() => setShowPifModal(false)}
        products={products}
      />
    </div>
  );
};
