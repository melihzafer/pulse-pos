import React, { useEffect, useState } from 'react';
import { X, Clock, ArrowRight } from 'lucide-react';
import { db, ParkedSale, formatCurrency } from '@pulse/core-logic';
import { useTranslation } from 'react-i18next';

interface ParkedSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (sale: ParkedSale) => void;
}

export const ParkedSalesModal: React.FC<ParkedSalesModalProps> = ({ isOpen, onClose, onRestore }) => {
  const { t } = useTranslation();
  const [parkedSales, setParkedSales] = useState<ParkedSale[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadParkedSales();
    }
  }, [isOpen]);

  const loadParkedSales = async () => {
    const sales = await db.parked_sales.toArray();
    // Sort by parked_at desc
    sales.sort((a, b) => new Date(b.parked_at).getTime() - new Date(a.parked_at).getTime());
    setParkedSales(sales);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="text-blue-500" />
            {t('pos.parkedSales')}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {parkedSales.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-slate-400">
              {t('pos.noParkedSales')}
            </div>
          ) : (
            parkedSales.map((sale) => (
              <div key={sale.id} className="glass-panel p-4 rounded-xl flex justify-between items-center group hover:border-blue-300 dark:hover:border-blue-500 transition-all">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-gray-500 dark:text-slate-400">
                      {new Date(sale.parked_at).toLocaleTimeString()}
                    </span>
                    {sale.note && (
                      <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs px-2 py-0.5 rounded-full">
                        {sale.note}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {sale.items.length} {t('cart.item_other')} • {formatCurrency(sale.items.reduce((sum, item) => sum + item.subtotal, 0))}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 line-clamp-1">
                    {sale.items.map(i => i.product.name).join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => onRestore(sale)}
                  className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
