import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Grid3X3, Save } from 'lucide-react';
import { VariantService, db } from '@pulse/core-logic';
import type { Product, ProductVariant, VariantAttribute } from '@pulse/core-logic';
import clsx from 'clsx';
import { toast } from 'sonner';

export function VariantMatrixScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [attributes, setAttributes] = useState<Array<{ name: string; values: string[] }>>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrValues, setNewAttrValues] = useState('');

  useEffect(() => {
    db.products.toArray().then(setProducts);
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadProductVariants(selectedProduct);
    }
  }, [selectedProduct]);

  const loadProductVariants = async (productId: string) => {
    const attrs = await VariantService.getProductAttributes(productId);
    setAttributes(attrs.map(a => ({ name: a.attribute_name, values: a.attribute_values })));
    const vars = await VariantService.getVariantsByProduct(productId);
    setVariants(vars);
  };

  const handleAddAttribute = () => {
    if (!newAttrName.trim() || !newAttrValues.trim()) return;
    const values = newAttrValues.split(',').map(v => v.trim()).filter(Boolean);
    setAttributes([...attributes, { name: newAttrName.trim(), values }]);
    setNewAttrName('');
    setNewAttrValues('');
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleGenerateMatrix = async () => {
    if (!selectedProduct || attributes.length === 0) return;
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    try {
      await VariantService.setProductAttributes(selectedProduct, product.workspace_id, attributes);
      const newVariants = await VariantService.generateVariantMatrix(
        selectedProduct, product.workspace_id, product.sale_price, product.cost_price
      );
      await loadProductVariants(selectedProduct);
      toast.success(`Generated ${newVariants.length} new variants`);
    } catch (error) {
      console.error('[VariantMatrix] Generate variants failed:', error);
      toast.error('Failed to generate variants');
    }
  };

  const handleUpdateVariantStock = async (variantId: string, quantity: number) => {
    try {
      const variant = variants.find(v => v.id === variantId);
      if (!variant) return;
      await VariantService.adjustVariantStock(variantId, quantity - variant.stock_quantity);
      await loadProductVariants(selectedProduct);
    } catch (error) {
      console.error('[VariantMatrix] Update stock failed:', error);
      toast.error('Failed to update stock');
    }
  };

  const handleUpdateVariantPrice = async (variantId: string, price: number) => {
    try {
      await VariantService.updateVariant(variantId, { sale_price: price });
      await loadProductVariants(selectedProduct);
    } catch (error) {
      console.error('[VariantMatrix] Update price failed:', error);
      toast.error('Failed to update price');
    }
  };

  return (
    <div className="space-y-6">
      {/* Product Selector */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold mb-4">Product Variants</h2>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">Select a product...</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {selectedProduct && (
        <>
          {/* Attribute Configuration */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <h3 className="text-md font-semibold mb-4">Variant Attributes</h3>
            
            {attributes.map((attr, i) => (
              <div key={i} className="flex items-center gap-3 mb-2 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <span className="font-medium min-w-[100px]">{attr.name}</span>
                <div className="flex gap-1 flex-wrap flex-1">
                  {attr.values.map((v, vi) => (
                    <span key={vi} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                      {v}
                    </span>
                  ))}
                </div>
                <button onClick={() => handleRemoveAttribute(i)} className="p-1 text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <div className="flex gap-2 mt-3">
              <input
                value={newAttrName}
                onChange={(e) => setNewAttrName(e.target.value)}
                placeholder="Attribute name (e.g., Size)"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
              />
              <input
                value={newAttrValues}
                onChange={(e) => setNewAttrValues(e.target.value)}
                placeholder="Values (comma-separated: S, M, L, XL)"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
              />
              <button onClick={handleAddAttribute} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleGenerateMatrix}
              disabled={attributes.length === 0}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Grid3X3 className="w-4 h-4" />
              Generate Variant Matrix
            </button>
          </div>

          {/* Variant Table */}
          {variants.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-md font-semibold mb-4">Variants ({variants.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-600">
                      <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Variant</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">SKU</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Price</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Stock</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map(v => (
                      <tr key={v.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="py-2 px-3 font-medium">{v.name}</td>
                        <td className="py-2 px-3 text-gray-500">{v.sku || '-'}</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={v.sale_price}
                            onChange={(e) => handleUpdateVariantPrice(v.id, parseFloat(e.target.value) || 0)}
                            className="w-20 text-right px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={v.stock_quantity}
                            onChange={(e) => handleUpdateVariantStock(v.id, parseInt(e.target.value) || 0)}
                            className="w-20 text-right px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={clsx(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            v.stock_quantity === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            v.stock_quantity <= v.min_stock_level ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          )}>
                            {v.stock_quantity === 0 ? 'Out' : v.stock_quantity <= v.min_stock_level ? 'Low' : 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
