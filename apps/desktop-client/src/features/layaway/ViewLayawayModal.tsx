import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, User, Package, CheckCircle2, XCircle, DollarSign } from 'lucide-react';
import { LayawayService } from '@pulse/core-logic';
import type { LayawayOrder, LayawayOrderItem, LayawayPayment, Product, Customer } from '@pulse/core-logic';
import { toast } from 'sonner';

interface ViewLayawayModalProps {
  isOpen: boolean;
  onClose: () => void;
  layawayId: string;
  onComplete: (layawayId: string) => void;
  onCancel: (layawayId: string) => void;
  onRecordPayment: () => void;
}

export const ViewLayawayModal: React.FC<ViewLayawayModalProps> = ({
  isOpen,
  onClose,
  layawayId,
  onComplete,
  onCancel,
  onRecordPayment,
}) => {
  const [order, setOrder] = useState<LayawayOrder | null>(null);
  const [items, setItems] = useState<Array<{ item: LayawayOrderItem; product: Product }>>([]);
  const [payments, setPayments] = useState<LayawayPayment[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLayawayDetails = useCallback(async () => {
    setLoading(true);
    try {
      const details = await LayawayService.getLayawayOrderById(layawayId);
      if (details) {
        setOrder(details.order);
        setCustomer(details.customer);
        setPayments(details.payments);
      }

      const itemsWithProducts = await LayawayService.getLayawayItemsWithProducts(layawayId);
      setItems(itemsWithProducts);
    } catch (error) {
      console.error('Failed to load layaway details:', error);
      toast.error('Failed to load layaway details');
    } finally {
      setLoading(false);
    }
  }, [layawayId]);

  useEffect(() => {
    if (isOpen) {
      loadLayawayDetails();
    }
  }, [isOpen, loadLayawayDetails]);

  const handleComplete = () => {
    if (order && order.balance_due <= 0) {
      if (window.confirm('Mark this layaway order as completed?')) {
        onComplete(layawayId);
      }
    } else {
      toast.error('Cannot complete - balance still due');
    }
  };

  const handleCancel = () => {
    if (window.confirm(
      `Cancel this layaway order? A ${order?.restocking_fee_percent}% restocking fee will be deducted from the refund.`
    )) {
      onCancel(layawayId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Active
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 size={14} />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XCircle size={14} />
            Cancelled
          </span>
        );
      default:
        return null;
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

  const progress = ((order.total - order.balance_due) / order.total) * 100;
  const totalPaid = order.total - order.balance_due;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Layaway Order {order.order_number}
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                Created {formatDate(order.created_at)}
              </p>
            </div>
            {getStatusBadge(order.status)}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Customer Info */}
          {customer && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <User size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Customer</h3>
              </div>
              <p className="text-base font-medium text-gray-900 dark:text-white">{customer.name}</p>
              {customer.email && (
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{customer.email}</p>
              )}
              {customer.phone && (
                <p className="text-sm text-gray-600 dark:text-slate-400">{customer.phone}</p>
              )}
            </div>
          )}

          {/* Payment Progress */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800">
            <h3 className="text-sm font-medium text-emerald-900 dark:text-emerald-100 mb-3">
              Payment Progress
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">Total Amount</span>
                <span className="font-medium text-gray-900 dark:text-white">{order.total.toFixed(2)} BGN</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">Paid</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {totalPaid.toFixed(2)} BGN
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">Balance Due</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {order.balance_due.toFixed(2)} BGN
                </span>
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-slate-400 mb-1">
                  <span>{progress.toFixed(0)}% Complete</span>
                  <span>{(100 - progress).toFixed(0)}% Remaining</span>
                </div>
                <div className="w-full h-3 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package size={18} className="text-gray-600 dark:text-slate-400" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Items</h3>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-400">
                      Product
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-slate-400">
                      Qty
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-slate-400">
                      Unit Price
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-slate-400">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {items.map(({ item }) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.product_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-slate-400">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-slate-400">
                        {item.unit_price.toFixed(2)} BGN
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                        {item.subtotal.toFixed(2)} BGN
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 dark:bg-slate-800">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm text-right font-medium text-gray-700 dark:text-slate-300">
                      Subtotal
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-medium text-gray-900 dark:text-white">
                      {order.subtotal.toFixed(2)} BGN
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm text-right font-medium text-gray-700 dark:text-slate-300">
                      Tax (20%)
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-medium text-gray-900 dark:text-white">
                      {order.tax.toFixed(2)} BGN
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-sm text-right font-bold text-gray-900 dark:text-white">
                      Total
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-gray-900 dark:text-white">
                      {order.total.toFixed(2)} BGN
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment History */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-gray-600 dark:text-slate-400" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Payment History</h3>
            </div>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                No payments recorded yet
              </p>
            ) : (
              <div className="space-y-3">
                {payments.map((payment, index) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {payment.amount.toFixed(2)} BGN
                        </div>
                        <div className="text-xs text-gray-600 dark:text-slate-400">
                          {formatDate(payment.payment_date)}
                        </div>
                        {payment.notes && (
                          <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                            {payment.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {order.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-100 dark:border-amber-800">
              <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">Notes</h3>
              <p className="text-sm text-gray-700 dark:text-slate-300">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {order.status === 'active' && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
            <button
              onClick={handleCancel}
              className="px-6 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
            >
              Cancel Layaway
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={onRecordPayment}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg transition-all font-medium"
              >
                <DollarSign size={18} />
                Record Payment
              </button>
              {order.balance_due <= 0 && (
                <button
                  onClick={handleComplete}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-all font-medium"
                >
                  <CheckCircle2 size={18} />
                  Complete Order
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
