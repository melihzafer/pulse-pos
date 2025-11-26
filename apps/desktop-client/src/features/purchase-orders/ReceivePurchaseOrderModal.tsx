import { useState, useEffect, useCallback } from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import { PurchaseOrderService } from '@pulse/core-logic';
import { toast } from 'sonner';
import type { LocalPurchaseOrder } from '@pulse/core-logic';

interface ReceivePurchaseOrderModalProps {
  purchaseOrder: LocalPurchaseOrder;
  onClose: () => void;
  onSuccess: () => void;
}

interface ReceiveItem {
  id: string;
  productId: string;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityToReceive: number;
}

export function ReceivePurchaseOrderModal({
  purchaseOrder,
  onClose,
  onSuccess,
}: ReceivePurchaseOrderModalProps) {
  const [items, setItems] = useState<ReceiveItem[]>([]);
  const [notes, setNotes] = useState('');
  const [receiving, setReceiving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const result = await PurchaseOrderService.getPOItemsWithProducts(purchaseOrder.id);
      setItems(
        result.map((r) => ({
          id: r.item.id,
          productId: r.item.product_id,
          productName: r.product?.name || 'Unknown Product',
          quantityOrdered: r.item.quantity_ordered,
          quantityReceived: r.item.quantity_received,
          quantityToReceive: r.item.quantity_ordered - r.item.quantity_received,
        }))
      );
    } catch (error) {
      console.error('Failed to load PO items:', error);
      toast.error('Failed to load order items');
    } finally {
      setLoading(false);
    }
  }, [purchaseOrder.id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    setItems(
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantityToReceive: Math.max(
                0,
                Math.min(quantity, item.quantityOrdered - item.quantityReceived)
              ),
            }
          : item
      )
    );
  };

  const handleReceiveAll = () => {
    setItems(
      items.map((item) => ({
        ...item,
        quantityToReceive: item.quantityOrdered - item.quantityReceived,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemsToReceive = items.filter((item) => item.quantityToReceive > 0);
    if (itemsToReceive.length === 0) {
      toast.error('Please specify quantities to receive');
      return;
    }

    try {
      setReceiving(true);
      await PurchaseOrderService.receiveItems(
        purchaseOrder.id,
        itemsToReceive.map((item) => ({
          itemId: item.id,
          quantityReceived: item.quantityToReceive,
        }))
      );
      toast.success('Items received successfully');
      onSuccess();
    } catch (error) {
      console.error('Failed to receive items:', error);
      toast.error('Failed to receive items');
    } finally {
      setReceiving(false);
    }
  };

  const hasDiscrepancies = items.some(
    (item) => item.quantityToReceive < item.quantityOrdered - item.quantityReceived
  );
  const totalToReceive = items.reduce((sum, item) => sum + item.quantityToReceive, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Receive Items - {purchaseOrder.po_number}
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                Scan or enter quantities as items are received
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Quick Actions */}
              <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-900/50 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  Total items to receive: <span className="font-semibold text-gray-900 dark:text-white">{totalToReceive}</span>
                </div>
                <button
                  type="button"
                  onClick={handleReceiveAll}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                >
                  Receive All
                </button>
              </div>

              {/* Discrepancy Warning */}
              {hasDiscrepancies && (
                <div className="flex items-start space-x-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                      Quantity Discrepancy Detected
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      Some items are being received in different quantities than ordered. This will create backorders.
                    </p>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Items to Receive
                </h3>
                <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400">
                          Product
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400">
                          Ordered
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400">
                          Already Received
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400">
                          Remaining
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400">
                          Receive Now
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {items.map((item) => {
                        const remaining = item.quantityOrdered - item.quantityReceived;
                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {item.productName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-center">
                              {item.quantityOrdered}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className={item.quantityReceived > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                                {item.quantityReceived}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className={remaining > 0 ? 'text-yellow-600 dark:text-yellow-400 font-medium' : 'text-gray-400'}>
                                {remaining}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                value={item.quantityToReceive}
                                onChange={(e) =>
                                  handleUpdateQuantity(item.id, parseInt(e.target.value) || 0)
                                }
                                min="0"
                                max={remaining}
                                disabled={remaining === 0}
                                className="w-20 px-2 py-1 text-center border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Receiving Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
                  placeholder="Any notes about this delivery (damage, delays, quality issues, etc.)"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={receiving || totalToReceive === 0}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {receiving ? 'Processing...' : `Receive ${totalToReceive} Items`}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
