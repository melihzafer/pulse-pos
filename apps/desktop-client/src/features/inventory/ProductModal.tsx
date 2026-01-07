import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Plus, Trash2, Percent, DollarSign, TrendingUp, Calculator, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Product, db, ProductBarcode, formatMoney } from '@pulse/core-logic';
import { generateId } from '@pulse/core-logic/src/utils';

// Margin preset buttons
const MARGIN_PRESETS = [
  { label: '15%', value: 15 },
  { label: '25%', value: 25 },
  { label: '30%', value: 30 },
  { label: '50%', value: 50 },
  { label: '100%', value: 100 },
];

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
    stock_quantity: 0,
    min_stock_level: 5,
    age_restricted: false,
  });

  // Pricing mode: 'margin' = calculate sale from cost + margin, 'markup' = calculate cost from sale - margin
  const [pricingMode, setPricingMode] = useState<'margin' | 'markup'>('margin');
  const [marginPercent, setMarginPercent] = useState(30); // Default 30% margin

  const [additionalBarcodes, setAdditionalBarcodes] = useState<ProductBarcode[]>([]);
  const [newBarcode, setNewBarcode] = useState('');
  const [newMultiplier, setNewMultiplier] = useState(1);

  // Calculate profit metrics
  const profitMetrics = useMemo(() => {
    const cost = formData.cost_price || 0;
    const sale = formData.sale_price || 0;
    const profit = sale - cost;
    const marginPct = sale > 0 ? ((profit / sale) * 100) : 0;
    const markupPct = cost > 0 ? ((profit / cost) * 100) : 0;
    return { profit, marginPct, markupPct };
  }, [formData.cost_price, formData.sale_price]);

  // Calculate sale price from cost + margin percentage
  const calculateSaleFromCost = (cost: number, margin: number) => {
    // Margin = (Sale - Cost) / Sale * 100
    // So: Sale = Cost / (1 - Margin/100)
    if (margin >= 100) return cost * 2; // Cap at 100% margin
    return cost / (1 - margin / 100);
  };

  // Calculate cost from sale price + margin percentage
  const calculateCostFromSale = (sale: number, margin: number) => {
    // Cost = Sale * (1 - Margin/100)
    return sale * (1 - margin / 100);
  };

  // Handle cost price change
  const handleCostChange = (cost: number) => {
    if (pricingMode === 'margin') {
      const newSale = calculateSaleFromCost(cost, marginPercent);
      setFormData({ ...formData, cost_price: cost, sale_price: parseFloat(newSale.toFixed(2)) });
    } else {
      setFormData({ ...formData, cost_price: cost });
    }
  };

  // Handle sale price change
  const handleSaleChange = (sale: number) => {
    if (pricingMode === 'markup') {
      const newCost = calculateCostFromSale(sale, marginPercent);
      setFormData({ ...formData, sale_price: sale, cost_price: parseFloat(newCost.toFixed(2)) });
    } else {
      setFormData({ ...formData, sale_price: sale });
    }
  };

  // Handle margin percentage change
  const handleMarginChange = (margin: number) => {
    setMarginPercent(margin);
    if (pricingMode === 'margin' && formData.cost_price) {
      const newSale = calculateSaleFromCost(formData.cost_price, margin);
      setFormData({ ...formData, sale_price: parseFloat(newSale.toFixed(2)) });
    } else if (pricingMode === 'markup' && formData.sale_price) {
      const newCost = calculateCostFromSale(formData.sale_price, margin);
      setFormData({ ...formData, cost_price: parseFloat(newCost.toFixed(2)) });
    }
  };

  // Apply margin preset
  const applyMarginPreset = (preset: number) => {
    handleMarginChange(preset);
  };

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData(product);
        loadBarcodes(product.id);
        // Calculate existing margin
        if (product.cost_price && product.sale_price) {
          const existingMargin = ((product.sale_price - product.cost_price) / product.sale_price) * 100;
          setMarginPercent(Math.round(existingMargin));
        }
      } else {
        setFormData({
          name: '',
          barcode: '',
          sku: '',
          cost_price: 0,
          sale_price: 0,
          stock_quantity: 0,
          min_stock_level: 5,
          age_restricted: false,
        });
        setAdditionalBarcodes([]);
        setMarginPercent(30); // Reset to default
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

            {/* Enhanced Pricing Section */}
            <div className="md:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/50 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-indigo-800/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Pricing & Margin Calculator
                </h3>
                
                {/* Mode Toggle */}
                <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-slate-600">
                  <button
                    type="button"
                    onClick={() => setPricingMode('margin')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      pricingMode === 'margin'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Cost → Sale
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingMode('markup')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      pricingMode === 'markup'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Sale → Cost
                  </button>
                </div>
              </div>

              {/* Margin Presets */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-500 dark:text-slate-400">Quick margins:</span>
                {MARGIN_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => applyMarginPreset(preset.value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                      marginPercent === preset.value
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/30 border border-gray-200 dark:border-slate-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Price Inputs Grid */}
              <div className="grid grid-cols-3 gap-4">
                {/* Cost Price */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    {t('inventory.form.costPrice')}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.cost_price || ''}
                      onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
                      className={`w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm ${
                        pricingMode === 'margin' 
                          ? 'border-blue-300 dark:border-blue-600 dark:text-white' 
                          : 'border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400'
                      }`}
                      placeholder="0.00"
                    />
                    {pricingMode === 'margin' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">1</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Margin Input */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Profit Margin %
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="99"
                      value={marginPercent}
                      onChange={(e) => handleMarginChange(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-green-300 dark:border-green-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none dark:text-white font-mono text-sm"
                      placeholder="30"
                    />
                    <ArrowRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  </div>
                </div>

                {/* Sale Price */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    {t('inventory.form.salePrice')}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.sale_price || ''}
                      onChange={(e) => handleSaleChange(parseFloat(e.target.value) || 0)}
                      className={`w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm ${
                        pricingMode === 'markup' 
                          ? 'border-blue-300 dark:border-blue-600 dark:text-white' 
                          : 'border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400'
                      }`}
                      placeholder="0.00"
                    />
                    {pricingMode === 'markup' && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">1</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Profit Summary */}
              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-indigo-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    {/* Profit Amount */}
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`w-4 h-4 ${profitMetrics.profit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                      <div>
                        <span className="text-xs text-gray-500 dark:text-slate-400">Profit:</span>
                        <span className={`ml-1.5 font-bold font-mono ${
                          profitMetrics.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatMoney(profitMetrics.profit)}
                        </span>
                      </div>
                    </div>

                    {/* Actual Margin */}
                    <div>
                      <span className="text-xs text-gray-500 dark:text-slate-400">Actual Margin:</span>
                      <span className={`ml-1.5 font-bold font-mono ${
                        profitMetrics.marginPct >= 20 ? 'text-green-600 dark:text-green-400' : 
                        profitMetrics.marginPct >= 10 ? 'text-yellow-600 dark:text-yellow-400' : 
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {profitMetrics.marginPct.toFixed(1)}%
                      </span>
                    </div>

                    {/* Markup */}
                    <div>
                      <span className="text-xs text-gray-500 dark:text-slate-400">Markup:</span>
                      <span className="ml-1.5 font-bold font-mono text-blue-600 dark:text-blue-400">
                        {profitMetrics.markupPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Visual Margin Bar */}
                  <div className="w-32">
                    <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          profitMetrics.marginPct >= 30 ? 'bg-green-500' :
                          profitMetrics.marginPct >= 15 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(profitMetrics.marginPct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
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
                value={formData.stock_quantity ?? 0}
                onChange={(e) => setFormData({ ...formData, stock_quantity: parseFloat(e.target.value) || 0 })}
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
