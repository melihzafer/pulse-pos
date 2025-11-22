import React, { useState, useEffect } from 'react';
import { X, Search, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Product, db, PayItForwardItem, useCartStore, formatCurrency } from '@pulse/core-logic';
import clsx from 'clsx';

interface PayItForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export const PayItForwardModal: React.FC<PayItForwardModalProps> = ({ isOpen, onClose, products }) => {
  const { t } = useTranslation();
  const { addToCart } = useCartStore();
  const [mode, setMode] = useState<'donate' | 'redeem'>('donate');
  const [poolItems, setPoolItems] = useState<PayItForwardItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen && mode === 'redeem') {
      loadPool();
    }
  }, [isOpen, mode]);

  const loadPool = async () => {
    const items = await db.pay_it_forward.where('status').equals('available').toArray();
    setPoolItems(items);
  };

  const handleDonate = (product: Product) => {
    addToCart(product, 1, { isPayItForward: true });
    onClose();
  };

  const handleRedeem = async (item: PayItForwardItem) => {
    const product = products.find(p => p.id === item.product_id);
    if (product) {
      addToCart(product, 1, { redeemedFromPifId: item.id, priceOverride: 0 });
      onClose();
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPool = poolItems.filter(item => 
    item.product_name.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center text-pink-600 dark:text-pink-400">
              <Heart size={20} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('pif.title', 'Pay It Forward')}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setMode('donate')}
            className={clsx(
              "flex-1 py-4 font-medium text-center transition-colors relative",
              mode === 'donate' 
                ? "text-pink-600 dark:text-pink-400" 
                : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
            )}
          >
            {t('pif.donate', 'Donate')}
            {mode === 'donate' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-600 dark:bg-pink-400" />
            )}
          </button>
          <button
            onClick={() => setMode('redeem')}
            className={clsx(
              "flex-1 py-4 font-medium text-center transition-colors relative",
              mode === 'redeem' 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
            )}
          >
            {t('pif.redeem', 'Redeem')}
            {mode === 'redeem' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={t('common.search', 'Search...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-pink-500 dark:text-white"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'donate' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => handleDonate(product)}
                  className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-pink-500 dark:hover:border-pink-500 transition-all text-left group"
                >
                  <div className="font-medium text-gray-900 dark:text-white mb-1 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                    {product.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-slate-400">
                    {formatCurrency(product.sale_price)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPool.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                  {t('pif.empty', 'No items available in the pool.')}
                </div>
              ) : (
                filteredPool.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{item.product_name}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRedeem(item)}
                      className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-medium"
                    >
                      {t('pif.claim', 'Claim')}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
