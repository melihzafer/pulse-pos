import React from 'react';
import { X, Clock, ArrowRight, Trash2, StickyNote } from 'lucide-react';
import { db, ParkedSale, formatCurrency } from '@pulse/core-logic';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

interface ParkedSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (sale: ParkedSale) => void;
}

export const ParkedSalesModal: React.FC<ParkedSalesModalProps> = ({ isOpen, onClose, onRestore }) => {
  const { t } = useTranslation();
  
  const parkedSales = useLiveQuery(
    () => db.parked_sales.orderBy('parked_at').reverse().toArray()
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(t('common.confirmDelete', 'Delete this parked sale?'))) {
      await db.parked_sales.delete(id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-gray-200 dark:border-slate-700"
      >
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30 backdrop-blur-md">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-orange-500" />
              {t('pos.parkedSales', 'Parked Sales')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {parkedSales?.length || 0} {t('common.active', 'active')}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl text-gray-500 dark:text-slate-400 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin">
          {!parkedSales || parkedSales.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center justify-center text-gray-400 dark:text-slate-600">
              <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-10 h-10 opacity-50" />
              </div>
              <p className="text-lg font-medium">{t('pos.noParkedSales', 'No parked sales')}</p>
              <p className="text-sm opacity-70 mt-1">{t('pos.parkSaleHint', 'Park a sale from the cart to see it here')}</p>
            </div>
          ) : (
            <AnimatePresence>
              {parkedSales.map((sale) => (
                <motion.div
                  key={sale.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="group relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer"
                  onClick={() => onRestore(sale)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg">
                        {format(new Date(sale.parked_at), 'HH:mm')}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {format(new Date(sale.parked_at), 'MMM d')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                        {formatCurrency(sale.items.reduce((sum, item) => sum + item.subtotal, 0))}
                      </span>
                    </div>
                  </div>

                  {sale.note && (
                    <div className="mb-3 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                      <StickyNote size={16} className="shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{sale.note}</span>
                    </div>
                  )}

                  <div className="flex items-end justify-between mt-2">
                    <div className="text-sm text-gray-600 dark:text-slate-400">
                      <span className="font-medium text-gray-900 dark:text-slate-200">{sale.items.length}Items:</span>{' '}
                      {sale.items.map(i => i.product.name).join(', ').slice(0, 50)}
                      {sale.items.map(i => i.product.name).join(', ').length > 50 && '...'}
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 bottom-4 bg-white dark:bg-slate-800 shadow-lg p-1 rounded-lg border border-gray-100 dark:border-slate-700">
                      <button
                        onClick={(e) => handleDelete(e, sale.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 size={18} />
                      </button>
                      <div className="w-px h-6 bg-gray-200 dark:bg-slate-700"></div>
                      <button
                        onClick={() => onRestore(sale)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors font-medium flex items-center gap-1"
                        title={t('common.restore')}
                      >
                         <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
};
