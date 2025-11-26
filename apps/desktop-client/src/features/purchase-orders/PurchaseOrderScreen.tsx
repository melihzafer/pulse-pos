import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Search, Eye, Package } from 'lucide-react';
import { PurchaseOrderService, SupplierService } from '@pulse/core-logic';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { LocalPurchaseOrder, LocalSupplier, LocalPurchaseOrderItem } from '@pulse/core-logic';
// Import modals
import { CreatePurchaseOrderModal } from './CreatePurchaseOrderModal';
import { ReceivePurchaseOrderModal } from './ReceivePurchaseOrderModal';

const WORKSPACE_ID = '00000000-0000-0000-0000-000000000000'; // TODO: Get from settings

export function PurchaseOrderScreen() {
  const { t } = useTranslation();
  const [purchaseOrders, setPurchaseOrders] = useState<LocalPurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<LocalSupplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<LocalPurchaseOrder | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pos, suppliersData] = await Promise.all([
        PurchaseOrderService.getPurchaseOrders(WORKSPACE_ID),
        SupplierService.getSuppliers(WORKSPACE_ID, { activeOnly: true }),
      ]);
      setPurchaseOrders(pos);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Failed to load purchase orders:', error);
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find((s) => s.id === supplierId)?.name || 'Unknown Supplier';
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
      sent: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
      confirmed: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
      received: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
      cancelled: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredPOs = purchaseOrders.filter((po) => {
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSupplierName(po.supplier_id).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: purchaseOrders.length,
    draft: purchaseOrders.filter((po) => po.status === 'draft').length,
    sent: purchaseOrders.filter((po) => po.status === 'sent').length,
    confirmed: purchaseOrders.filter((po) => po.status === 'confirmed').length,
    received: purchaseOrders.filter((po) => po.status === 'received').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('Purchase Orders')}
                </h1>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                  Create and manage purchase orders
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Create PO</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4">
              <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Draft</div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.draft}</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-4">
              <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Sent</div>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.sent}</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-4">
              <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">Confirmed</div>
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.confirmed}</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-4">
              <div className="text-sm text-green-600 dark:text-green-400 mb-1">Received</div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.received}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by PO number or supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="confirmed">Confirmed</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Orders List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredPOs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-gray-400 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No purchase orders found' : 'No purchase orders yet'}
            </h3>
            <p className="text-gray-600 dark:text-slate-400 mb-4">
              {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first purchase order'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Create PO</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Order Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Expected Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-white">{po.po_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{getSupplierName(po.supplier_id)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(po.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-400">
                      {new Date(po.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-400">
                      {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {po.total.toFixed(2)} BGN
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setSelectedPO(po)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                        </button>
                        {(po.status === 'confirmed' || po.status === 'sent') && (
                          <button
                            onClick={() => {
                              setSelectedPO(po);
                              setIsReceiveModalOpen(true);
                            }}
                            className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Receive Items"
                          >
                            <Package className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreatePurchaseOrderModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            loadData();
          }}
        />
      )}

      {isReceiveModalOpen && selectedPO && (
        <ReceivePurchaseOrderModal
          purchaseOrder={selectedPO}
          onClose={() => {
            setIsReceiveModalOpen(false);
            setSelectedPO(null);
          }}
          onSuccess={() => {
            setIsReceiveModalOpen(false);
            setSelectedPO(null);
            loadData();
          }}
        />
      )}

      {/* View Details Modal */}
      {selectedPO && !isReceiveModalOpen && (
        <ViewPurchaseOrderModal
          purchaseOrder={selectedPO}
          supplierName={getSupplierName(selectedPO.supplier_id)}
          onClose={() => setSelectedPO(null)}
        />
      )}
    </div>
  );
}

interface ViewPurchaseOrderModalProps {
  purchaseOrder: LocalPurchaseOrder;
  supplierName: string;
  onClose: () => void;
}

function ViewPurchaseOrderModal({ purchaseOrder, supplierName, onClose }: ViewPurchaseOrderModalProps) {
  const [items, setItems] = useState<LocalPurchaseOrderItem[]>([]);

  const loadItems = useCallback(async () => {
    try {
      const result = await PurchaseOrderService.getPOItemsWithProducts(purchaseOrder.id);
      const poItems = result.map((r) => r.item);
      setItems(poItems);
    } catch (error) {
      console.error('Failed to load PO items:', error);
    }
  }, [purchaseOrder.id]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {purchaseOrder.po_number}
              </h2>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{supplierName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Status</div>
              <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white capitalize">
                {purchaseOrder.status}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Order Date</div>
              <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {new Date(purchaseOrder.order_date).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Expected Delivery</div>
              <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {purchaseOrder.expected_delivery_date
                  ? new Date(purchaseOrder.expected_delivery_date).toLocaleDateString()
                  : 'Not specified'}
              </div>
            </div>
            {purchaseOrder.actual_delivery_date && (
              <div>
                <div className="text-sm text-gray-600 dark:text-slate-400">Actual Delivery</div>
                <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(purchaseOrder.actual_delivery_date).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Order Items</h3>
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400">
                      Product
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-slate-400">
                      Ordered
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-slate-400">
                      Received
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-slate-400">
                      Unit Cost
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-slate-400">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.product_name || 'Unknown Product'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">
                        {item.quantity_ordered}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span
                          className={
                            item.quantity_received < item.quantity_ordered
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-green-600 dark:text-green-400'
                          }
                        >
                          {item.quantity_received}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">
                        {item.unit_cost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">
                        {item.total_cost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">Subtotal</span>
              <span className="text-gray-900 dark:text-white">{purchaseOrder.subtotal.toFixed(2)} BGN</span>
            </div>
            {purchaseOrder.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">Tax</span>
                <span className="text-gray-900 dark:text-white">{purchaseOrder.tax.toFixed(2)} BGN</span>
              </div>
            )}
            {purchaseOrder.shipping > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-slate-400">Shipping</span>
                <span className="text-gray-900 dark:text-white">{purchaseOrder.shipping.toFixed(2)} BGN</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200 dark:border-slate-700">
              <span className="text-gray-900 dark:text-white">Total</span>
              <span className="text-gray-900 dark:text-white">{purchaseOrder.total.toFixed(2)} BGN</span>
            </div>
          </div>

          {purchaseOrder.notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Notes</h3>
              <p className="text-sm text-gray-600 dark:text-slate-400">{purchaseOrder.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
