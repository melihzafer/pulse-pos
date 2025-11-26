import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Product, db, ProductBarcode } from '@pulse/core-logic';
import { generateId } from '@pulse/core-logic/src/utils';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  onSave: (product: Partial<Product>) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    barcode: '',
    sku: '',
    cost_price: 0,
    sale_price: 0,
    quantity_on_hand: 0,
    min_stock_level: 5,
    age_restricted: false,
  });

  const [additionalBarcodes, setAdditionalBarcodes] = useState<ProductBarcode[]>([]);
  const [newBarcode, setNewBarcode] = useState('');
  const [newMultiplier, setNewMultiplier] = useState(1);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData(product);
        loadBarcodes(product.id);
      } else {
        setFormData({
          name: '',
          barcode: '',
          sku: '',
          cost_price: 0,
          sale_price: 0,
          quantity_on_hand: 0,
          min_stock_level: 5,
          age_restricted: false,
        });
        setAdditionalBarcodes([]);
      }
    }
  }, [isOpen, product]);

  const loadBarcodes = async (productId: string) => {
    const barcodes = await db.product_barcodes.where('product_id').equals(productId).toArray();
    setAdditionalBarcodes(barcodes);
  };

  const handleAddBarcode = () => {
    if (!newBarcode) return;
    
    const newItem: ProductBarcode = {
      id: generateId(),
      product_id: product?.id || '', // Will be set on save if new product
      barcode: newBarcode,
      multiplier: newMultiplier,
      created_at: new Date().toISOString()
    };
    
    setAdditionalBarcodes([...additionalBarcodes, newItem]);
    setNewBarcode('');
    setNewMultiplier(1);
  };

  const handleRemoveBarcode = (id: string) => {
    setAdditionalBarcodes(additionalBarcodes.filter(b => b.id !== id));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save product first (handled by parent)
    onSave(formData);

    // Save barcodes if we have a product ID (editing)
    // For new products, this logic needs to be in the parent or we need the ID first.
    // For MVP, let's assume we only support adding barcodes to existing products or handle it if ID exists.
    
    if (product?.id) {
      // Delete existing for this product (simple sync)
      const existingIds = (await db.product_barcodes.where('product_id').equals(product.id).toArray()).map(b => b.id);
      await db.product_barcodes.bulkDelete(existingIds);
      
      // Add current
      const toAdd = additionalBarcodes.map(b => ({ ...b, product_id: product.id }));
      await db.product_barcodes.bulkAdd(toAdd);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {product ? t('inventory.form.editTitle') : t('inventory.form.addTitle')}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                {t('inventory.form.name')}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
              />
            </div>

            {/* Barcode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                {t('inventory.form.barcode')}
              </label>
              <input
                type="text"
                value={formData.barcode || ''}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-mono"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                {t('inventory.form.sku')}
              </label>
              <input
                type="text"
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-mono"
              />
            </div>

            {/* Cost Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                {t('inventory.form.costPrice')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-mono"
              />
            </div>

            {/* Sale Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                {t('inventory.form.salePrice')}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.sale_price}
                onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-mono"
              />
            </div>

            {/* Stock Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                {t('inventory.form.stock')}
              </label>
              <input
                type="number"
                step="1"
                required
                value={formData.quantity_on_hand ?? 0}
                onChange={(e) => setFormData({ ...formData, quantity_on_hand: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white font-mono"
              />
            </div>

            {/* Min Stock Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                {t('inventory.form.minStock')}
              </label>
              <input
                type="number"
                min="0"
                value={formData.min_stock_level}
                onChange={(e) => setFormData({ ...formData, min_stock_level: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
              />
            </div>

            {/* Age Restricted */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="age_restricted"
                checked={formData.age_restricted || false}
                onChange={(e) => setFormData({ ...formData, age_restricted: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="age_restricted" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Age Restricted (18+)
              </label>
            </div>

            {/* Multi-Unit Barcodes */}
            {product && (
              <div className="md:col-span-2 border-t border-gray-200 dark:border-slate-700 pt-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Additional Barcodes (Multi-Packs)</h3>
                
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Barcode"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={newMultiplier}
                    onChange={(e) => setNewMultiplier(parseFloat(e.target.value) || 1)}
                    className="w-20 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddBarcode}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="space-y-2">
                  {additionalBarcodes.map(b => (
                    <div key={b.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg">
                      <div className="text-sm">
                        <span className="font-mono text-gray-600 dark:text-gray-400">{b.barcode}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="font-medium dark:text-white">{b.multiplier} units</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBarcode(b.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t('inventory.form.cancel')}
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Save size={20} />
              {t('inventory.form.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
