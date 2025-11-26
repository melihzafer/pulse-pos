import { useState, useEffect } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { PurchaseOrderService, SupplierService, db } from '@pulse/core-logic';
import { toast } from 'sonner';
import type { LocalSupplier, LocalProduct } from '@pulse/core-logic';

const WORKSPACE_ID = '00000000-0000-0000-0000-000000000000'; // TODO: Get from settings

interface CreatePurchaseOrderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface POItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

export function CreatePurchaseOrderModal({ onClose, onSuccess }: CreatePurchaseOrderModalProps) {
  const [suppliers, setSuppliers] = useState<LocalSupplier[]>([]);
  const [products, setProducts] = useState<LocalProduct[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lowStockProducts, setLowStockProducts] = useState<Array<{
    product: LocalProduct;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    preferredSupplier: { supplier: any; link: any } | null;
    suggestedQuantity: number;
  }>>([]);
  
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [tax, setTax] = useState('0');
  const [shipping, setShipping] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<POItem[]>([]);
  
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [suppliersData, productsData, lowStock] = await Promise.all([
        SupplierService.getSuppliers(WORKSPACE_ID, { activeOnly: true }),
        db.products.toArray(),
        PurchaseOrderService.getLowStockProducts(WORKSPACE_ID),
      ]);
      setSuppliers(suppliersData.filter((s) => s.is_active));
      setProducts(productsData);
      setLowStockProducts(lowStock);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    }
  };

  const handleAddItem = (product: LocalProduct) => {
    if (items.find((item) => item.productId === product.id)) {
      toast.error('Product already added');
      return;
    }

    setItems([
      ...items,
      {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitCost: product.cost_price || 0,
      },
    ]);
    setShowProductSearch(false);
    setProductSearchQuery('');
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter((item) => item.productId !== productId));
  };

  const handleUpdateItem = (productId: string, field: 'quantity' | 'unitCost', value: number) => {
    setItems(
      items.map((item) =>
        item.productId === productId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplierId) {
      toast.error('Please select a supplier');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      setSaving(true);
      await PurchaseOrderService.createPurchaseOrder(WORKSPACE_ID, {
        supplierId: selectedSupplierId,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantityOrdered: item.quantity,
          unitCost: item.unitCost,
        })),
      });
      toast.success('Purchase order created successfully');
      onSuccess();
    } catch (error) {
      console.error('Failed to create purchase order:', error);
      toast.error('Failed to create purchase order');
    } finally {
      setSaving(false);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const taxAmount = parseFloat(tax) || 0;
  const shippingAmount = parseFloat(shipping) || 0;
  const total = subtotal + taxAmount + shippingAmount;

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create Purchase Order
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Supplier *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Low Stock Suggestions */}
          {lowStockProducts.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                Low Stock Products ({lowStockProducts.length})
              </h4>
              <div className="space-y-2">
                {lowStockProducts.slice(0, 3).map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-yellow-700 dark:text-yellow-400">
                      {item.product.name} (Stock: {item.product.stock_quantity})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddItem(item.product)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Order Items
              </h3>
              <button
                type="button"
                onClick={() => setShowProductSearch(!showProductSearch)}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>

            {/* Product Search */}
            {showProductSearch && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAddItem(product)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-sm text-gray-900 dark:text-white"
                    >
                      {product.name} - {product.cost_price?.toFixed(2) || '0.00'} BGN
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Items Table */}
            {items.length > 0 ? (
              <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400">
                        Product
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-slate-400">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-slate-400">
                        Unit Cost
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-slate-400">
                        Total
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {items.map((item) => (
                      <tr key={item.productId}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {item.productName}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItem(
                                item.productId,
                                'quantity',
                                parseInt(e.target.value) || 0
                              )
                            }
                            min="1"
                            className="w-20 px-2 py-1 text-right border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            value={item.unitCost}
                            onChange={(e) =>
                              handleUpdateItem(
                                item.productId,
                                'unitCost',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            min="0"
                            step="0.01"
                            className="w-24 px-2 py-1 text-right border border-gray-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white text-sm"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">
                          {(item.quantity * item.unitCost).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  No items added yet. Click "Add Product" to get started.
                </p>
              </div>
            )}
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Tax
              </label>
              <input
                type="number"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Shipping
              </label>
              <input
                type="number"
                value={shipping}
                onChange={(e) => setShipping(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white"
              placeholder="Additional notes or instructions..."
            />
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">Subtotal</span>
              <span className="text-gray-900 dark:text-white">{subtotal.toFixed(2)} BGN</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">Tax</span>
              <span className="text-gray-900 dark:text-white">{taxAmount.toFixed(2)} BGN</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">Shipping</span>
              <span className="text-gray-900 dark:text-white">{shippingAmount.toFixed(2)} BGN</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200 dark:border-slate-700">
              <span className="text-gray-900 dark:text-white">Total</span>
              <span className="text-gray-900 dark:text-white">{total.toFixed(2)} BGN</span>
            </div>
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
              disabled={saving || items.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
