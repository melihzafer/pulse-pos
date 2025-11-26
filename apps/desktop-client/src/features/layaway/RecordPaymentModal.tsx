import React, { useState, useEffect, useCallback } from 'react';
import { X, DollarSign } from 'lucide-react';
import { LayawayService } from '@pulse/core-logic';
import type { LayawayOrder } from '@pulse/core-logic';
import { toast } from 'sonner';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  layawayId: string;
  onSuccess: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  layawayId,
  onSuccess,
}) => {
  const [order, setOrder] = useState<LayawayOrder | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      const details = await LayawayService.getLayawayOrderById(layawayId);
      if (details) {
        setOrder(details.order);
        // Default to remaining balance
        setAmount(details.order.balance_due.toFixed(2));
      }
    } catch (error) {
      console.error('Failed to load order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [layawayId]);

  useEffect(() => {
    if (isOpen) {
      loadOrder();
    }
  }, [isOpen, loadOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!order) return;

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (paymentAmount > order.balance_due) {
      toast.error('Payment amount cannot exceed balance due');
      return;
    }

    setIsSubmitting(true);
    try {
      await LayawayService.recordPayment(layawayId, paymentAmount, notes || undefined);
      onSuccess();
    } catch (error) {
      console.error('Failed to record payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setQuickAmount = (percentage: number) => {
    if (order) {
      const quickAmount = (order.balance_due * percentage) / 100;
      setAmount(quickAmount.toFixed(2));
    }
  };

  if (!isOpen) return null;

  if (loading || !order) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-slate-400 mt-4 text-center">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-lg flex items-center justify-center">
              <DollarSign size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Payment</h2>
              <p className="text-sm text-gray-600 dark:text-slate-400">{order.order_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Balance Info */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-amber-100 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">Balance Due</span>
              <span className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {order.balance_due.toFixed(2)} BGN
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Payment Amount (BGN)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0.01"
              max={order.balance_due}
              placeholder="Enter amount..."
              className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
              required
            />
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Quick Amounts
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setQuickAmount(25)}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-gray-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors font-medium"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => setQuickAmount(50)}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-gray-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors font-medium"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setQuickAmount(75)}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-gray-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors font-medium"
              >
                75%
              </button>
              <button
                type="button"
                onClick={() => setAmount(order.balance_due.toFixed(2))}
                className="px-3 py-2 text-sm bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors font-medium"
              >
                Full
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add payment notes..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Remaining Balance Preview */}
          {amount && parseFloat(amount) > 0 && parseFloat(amount) <= order.balance_due && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-300">Remaining Balance</span>
                <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {(order.balance_due - parseFloat(amount)).toFixed(2)} BGN
                </span>
              </div>
              {order.balance_due - parseFloat(amount) <= 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                  ✓ This payment will complete the layaway order
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
