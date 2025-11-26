import React, { useEffect, useState } from 'react';
import { Plus, ArrowRight, Package, CheckCircle, X, XCircle } from 'lucide-react';
import { StockTransferService, LocationService, db } from '@pulse/core-logic';
import type { StockTransfer, StockTransferItem, Location, Product } from '@pulse/core-logic';
import { toast } from 'sonner';

export const StockTransferScreen: React.FC = () => {
  const [transfers, setTransfers] = useState<Array<StockTransfer & { items: StockTransferItem[] }>>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<(StockTransfer & { items: StockTransferItem[] }) | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const workspaceId = 'default-workspace';
      const [transfersData, locationsData] = await Promise.all([
        StockTransferService.getTransfers(workspaceId),
        LocationService.getAllLocations(workspaceId),
      ]);
      
      setTransfers(transfersData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  const getLocationName = (locationId: string) => {
    return locations.find(l => l.id === locationId)?.name || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      requested: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30',
      approved: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
      shipped: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30',
      received: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30',
      cancelled: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-white/60">Loading stock transfers...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Stock Transfers</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage inventory transfers between locations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg
                     hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-5 h-5" />
          New Transfer
        </button>
      </div>

      {/* Transfers List */}
      <div className="flex-1 space-y-4">
        {transfers.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-white/40 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>No stock transfers yet</p>
          </div>
        ) : (
          transfers.map((transfer) => (
            <div
              key={transfer.id}
              onClick={() => setSelectedTransfer(transfer)}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{transfer.transfer_number}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <span className="font-medium">{getLocationName(transfer.from_location_id)}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{getLocationName(transfer.to_location_id)}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(transfer.status)}`}>
                  {transfer.status.toUpperCase()}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-slate-700">
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {transfer.items.length} items
                </span>
                <span>{new Date(transfer.requested_date).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Transfer Modal */}
      {showCreateModal && (
        <CreateTransferModal
          locations={locations}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      {/* Transfer Details Modal */}
      {selectedTransfer && (
        <TransferDetailsModal
          transfer={selectedTransfer}
          locations={locations}
          onClose={() => setSelectedTransfer(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
};

interface CreateTransferModalProps {
  locations: Location[];
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTransferModal: React.FC<CreateTransferModalProps> = ({ locations, onClose, onSuccess }) => {
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedItems, setSelectedItems] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (fromLocationId) {
      loadProducts(fromLocationId);
    }
  }, [fromLocationId]);

  const loadProducts = async (locationId: string) => {
    const prods = await db.products
      .where('location_id')
      .equals(locationId)
      .toArray();
    setProducts(prods);
  };

  const addItem = (product: Product) => {
    if (!selectedItems.find(item => item.product.id === product.id)) {
      setSelectedItems([...selectedItems, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setSelectedItems(items =>
      items.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setSelectedItems(items => items.filter(item => item.product.id !== productId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromLocationId || !toLocationId || selectedItems.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await StockTransferService.createTransfer(
        'default-workspace',
        fromLocationId,
        toLocationId,
        'current-user-id', // TODO: Get from auth
        selectedItems.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity_requested: item.quantity,
        })),
        notes
      );

      toast.success('Transfer request created');
      onSuccess();
    } catch (error) {
      console.error('Failed to create transfer:', error);
      toast.error('Failed to create transfer');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-slate-700 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Stock Transfer</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From Location *</label>
              <select
                value={fromLocationId}
                onChange={(e) => setFromLocationId(e.target.value)}
                required
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">Select location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To Location *</label>
              <select
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value)}
                required
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">Select location</option>
                {locations.filter(l => l.id !== fromLocationId).map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {fromLocationId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Products *</label>
              <select
                onChange={(e) => {
                  const product = products.find(p => p.id === e.target.value);
                  if (product) addItem(product);
                  e.target.value = '';
                }}
                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">Select product to add</option>
                {products.map(prod => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name} (Stock: {prod.stock_quantity})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedItems.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Selected Items</label>
              <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-slate-700">
                {selectedItems.map(item => (
                  <div key={item.product.id} className="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="flex-1">
                      <div className="text-gray-900 dark:text-white font-medium">{item.product.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Available: {item.product.stock_quantity}</div>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={item.product.stock_quantity}
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                      className="w-24 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1 text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id)}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Optional notes about this transfer"
            />
          </div>
        </form>

        <div className="flex gap-3 p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!fromLocationId || !toLocationId || selectedItems.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg
                       hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
          >
            Create Transfer
          </button>
        </div>
      </div>
    </div>
  );
};

interface TransferDetailsModalProps {
  transfer: StockTransfer & { items: StockTransferItem[] };
  locations: Location[];
  onClose: () => void;
  onUpdate: () => void;
}

const TransferDetailsModal: React.FC<TransferDetailsModalProps> = ({ transfer, locations, onClose, onUpdate }) => {
  const getLocationName = (locationId: string) => {
    return locations.find(l => l.id === locationId)?.name || 'Unknown';
  };

  const handleApprove = async () => {
    try {
      await StockTransferService.approveTransfer(
        transfer.id,
        'current-user-id', // TODO: Get from auth
        transfer.items.map(item => ({
          item_id: item.id,
          quantity_approved: item.quantity_requested,
        }))
      );
      toast.success('Transfer approved');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to approve transfer');
    }
  };

  const handleShip = async () => {
    try {
      await StockTransferService.shipTransfer(transfer.id);
      toast.success('Transfer marked as shipped');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to ship transfer');
    }
  };

  const handleReceive = async () => {
    try {
      await StockTransferService.receiveTransfer(
        transfer.id,
        transfer.items.map(item => ({
          item_id: item.id,
          quantity_received: item.quantity_approved,
        }))
      );
      toast.success('Transfer received');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to receive transfer');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this transfer?')) return;
    
    try {
      await StockTransferService.cancelTransfer(transfer.id);
      toast.success('Transfer cancelled');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to cancel transfer');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-slate-700">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{transfer.transfer_number}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
            <span className="font-medium">{getLocationName(transfer.from_location_id)}</span>
            <ArrowRight className="w-5 h-5 text-blue-500" />
            <span className="font-medium">{getLocationName(transfer.to_location_id)}</span>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-slate-900/50 px-4 py-3 border-b border-gray-200 dark:border-slate-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Items</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {transfer.items.map(item => (
                <div key={item.id} className="flex justify-between items-center p-4 text-sm hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <span className="text-gray-900 dark:text-white font-medium">{item.product_name}</span>
                  <div className="text-gray-500 dark:text-gray-400 space-x-3">
                    <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">Req: {item.quantity_requested}</span>
                    {item.quantity_approved > 0 && <span className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded">Appr: {item.quantity_approved}</span>}
                    {item.quantity_received > 0 && <span className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">Rec: {item.quantity_received}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {transfer.notes && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-4 border border-yellow-100 dark:border-yellow-900/20">
              <h3 className="text-yellow-800 dark:text-yellow-200 font-semibold mb-2 text-sm uppercase tracking-wide">Notes</h3>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">{transfer.notes}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {transfer.status === 'requested' && (
              <>
                <button
                  onClick={handleApprove}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg shadow-green-600/20 font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
              </>
            )}

            {transfer.status === 'approved' && (
              <button
                onClick={handleShip}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                Mark as Shipped
              </button>
            )}

            {transfer.status === 'shipped' && (
              <button
                onClick={handleReceive}
                className="flex-1 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20"
              >
                Receive Transfer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
