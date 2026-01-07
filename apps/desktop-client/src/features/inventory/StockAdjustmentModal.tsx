import React, { useState, useEffect, useCallback } from 'react';
import { X, Package, AlertTriangle, History, Plus, Minus, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Product, StockMovement } from '@pulse/core-logic';
import { useRxCollection } from 'rxdb-hooks';
import clsx from 'clsx';
import { format, isWithinInterval, subDays } from 'date-fns';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  onAdjustmentComplete?: () => void;
}

const ADJUSTMENT_REASONS = [
  { value: 'damaged', label: 'Damaged', icon: '💔', color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
  { value: 'expired', label: 'Expired', icon: '⏰', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
  { value: 'theft', label: 'Theft/Shrinkage', icon: '🚨', color: 'text-red-700 bg-red-100 dark:bg-red-900/30' },
  { value: 'counting_error', label: 'Counting Error', icon: '🔢', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  { value: 'promotion', label: 'Promotional Use', icon: '🎁', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  { value: 'sample', label: 'Sample/Tester', icon: '🧪', color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20' },
  { value: 'other', label: 'Other', icon: '📝', color: 'text-gray-600 bg-gray-50 dark:bg-gray-700' },
] as const;

type AdjustmentReason = typeof ADJUSTMENT_REASONS[number]['value'];

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  product,
  onAdjustmentComplete,
}) => {
  useTranslation(); // For future i18n
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('remove');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<AdjustmentReason>('damaged');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [adjustmentHistory, setAdjustmentHistory] = useState<StockMovement[]>([]);
  const productsCollection = useRxCollection<Product>('products');
  const movementsCollection = useRxCollection<StockMovement>('stock_movements');

  // Load adjustment history for this product
  const loadHistory = useCallback(async () => {
    if (!product || !movementsCollection) return;
    
    try {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const movements = await movementsCollection.find({
        selector: {
            product_id: product.id,
            reason: 'correction',
            created_at: { $gte: thirtyDaysAgo }
        },
        sort: [{ created_at: 'desc' }]
      }).exec();
      
      setAdjustmentHistory(movements.map(m => m.toJSON()) as StockMovement[]);
    } catch (error) {
      console.error('Failed to load adjustment history:', error);
    }
  }, [product, movementsCollection]);

  useEffect(() => {
    if (isOpen && product) {
      loadHistory();
      // Reset form
      setAdjustmentType('remove');
      setQuantity(1);
      setReason('damaged');
      setNotes('');
      setShowHistory(false);
    }
  }, [isOpen, product, loadHistory]);

  const handleSubmit = async () => {
    if (!product || quantity <= 0) return;

    setLoading(true);
    try {
      const quantityChange = adjustmentType === 'add' ? quantity : -quantity;
      // Handle schema mismatch (quantity_on_hand in data vs stock_quantity in type)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentQty = product.stock_quantity ?? 0;
      const newQuantity = currentQty + quantityChange;

      // Don't allow negative stock
      if (newQuantity < 0) {
        alert('Cannot reduce stock below 0');
        setLoading(false);
        return;
      }

      // Create stock movement record
      if (movementsCollection) {
          await movementsCollection.insert({
            id: crypto.randomUUID(),
            workspace_id: product.workspace_id,
            product_id: product.id,
            quantity_change: quantityChange,
            reason: 'correction',
            adjustment_reason: reason,
            adjustment_notes: notes || undefined,
            created_at: new Date().toISOString(),
          });
      }

      // Update product stock
      if (productsCollection) {
          const productDoc = await productsCollection.findOne(product.id).exec();
          if (productDoc) {
              await productDoc.patch({
                stock_quantity: newQuantity,
                updated_at: new Date().toISOString(),
              });
          }
      }

      onAdjustmentComplete?.();
      onClose();
    } catch (error) {
      console.error('Failed to adjust stock:', error);
      alert('Failed to adjust stock. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getReasonInfo = (reasonValue: string) => {
    return ADJUSTMENT_REASONS.find((r) => r.value === reasonValue) || ADJUSTMENT_REASONS[6];
  };

  if (!isOpen || !product) return null;

  // Handle schema mismatch (quantity_on_hand in data vs stock_quantity in type)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentStock = product.stock_quantity ?? 0;
  const projectedStock = adjustmentType === 'add' 
    ? currentStock + quantity 
    : currentStock - quantity;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Stock Adjustment</h2>
                <p className="text-amber-100 text-sm">{product.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
                  showHistory 
                    ? 'bg-white text-amber-600' 
                    : 'bg-white/20 text-white hover:bg-white/30'
                )}
              >
                <History size={16} />
                History
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {showHistory ? (
          /* Adjustment History View */
          <div className="p-6 max-h-[60vh] overflow-auto scrollbar-thin">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <FileText size={16} />
              Recent Adjustments (Last 30 Days)
            </h3>
            
            {adjustmentHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                No stock adjustments recorded for this product
              </div>
            ) : (
              <div className="space-y-3">
                {adjustmentHistory.map((movement) => {
                  const reasonInfo = getReasonInfo(movement.adjustment_reason || 'other');
                  return (
                    <div
                      key={movement.id}
                      className={clsx(
                        'p-4 rounded-xl border',
                        movement.quantity_change > 0
                          ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20'
                          : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{reasonInfo.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={clsx(
                                'font-bold font-mono',
                                movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
                              )}>
                                {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                              </span>
                              <span className={clsx(
                                'px-2 py-0.5 rounded-full text-xs font-medium',
                                reasonInfo.color
                              )}>
                                {reasonInfo.label}
                              </span>
                            </div>
                            {movement.adjustment_notes && (
                              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                                "{movement.adjustment_notes}"
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500 dark:text-slate-400">
                          {movement.created_at && format(new Date(movement.created_at), 'MMM d, yyyy')}
                          <br />
                          {movement.created_at && format(new Date(movement.created_at), 'HH:mm')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Adjustment Form */
          <div className="p-6 space-y-6">
            {/* Current Stock Display */}
            <div className="flex items-center justify-center gap-8 py-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Current Stock</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono">{currentStock}</p>
              </div>
              <div className="text-2xl text-gray-400">→</div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">After Adjustment</p>
                <p className={clsx(
                  'text-3xl font-bold font-mono',
                  projectedStock < 0 ? 'text-red-500' :
                  projectedStock === 0 ? 'text-amber-500' : 'text-green-500'
                )}>
                  {projectedStock}
                </p>
              </div>
            </div>

            {/* Adjustment Type Toggle */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentType('remove')}
                className={clsx(
                  'flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
                  adjustmentType === 'remove'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                )}
              >
                <Minus size={20} />
                Remove Stock
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={clsx(
                  'flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
                  adjustmentType === 'add'
                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/30'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                )}
              >
                <Plus size={20} />
                Add Stock
              </button>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-300 font-bold text-xl transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max={adjustmentType === 'remove' ? currentStock : 9999}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 text-center text-2xl font-bold font-mono py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-300 font-bold text-xl transition-colors"
                >
                  +
                </button>
              </div>
              {/* Quick quantity buttons */}
              <div className="flex gap-2 mt-2">
                {[1, 5, 10, 25].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(q)}
                    className={clsx(
                      'px-3 py-1 rounded-lg text-sm font-medium transition-all',
                      quantity === q
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ADJUSTMENT_REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    className={clsx(
                      'p-3 rounded-xl text-left transition-all border-2',
                      reason === r.value
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-transparent bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700'
                    )}
                  >
                    <span className="text-xl block mb-1">{r.icon}</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add any additional details about this adjustment..."
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none dark:text-white resize-none"
              />
            </div>

            {/* Warning for negative stock */}
            {projectedStock < 0 && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">
                  This adjustment would result in negative stock. Please reduce the quantity.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!showHistory && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || quantity <= 0 || projectedStock < 0}
              className={clsx(
                'px-6 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2',
                loading || quantity <= 0 || projectedStock < 0
                  ? 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                  : adjustmentType === 'remove'
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30'
              )}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {adjustmentType === 'remove' ? <Minus size={18} /> : <Plus size={18} />}
                  Confirm Adjustment
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
