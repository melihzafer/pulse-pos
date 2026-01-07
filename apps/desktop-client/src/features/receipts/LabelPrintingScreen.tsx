import React, { useState, useEffect } from 'react';
import {
  Tag,
  Barcode,
  Search,
  Printer,
  Settings,
  Package,
  Loader2,
  Check,
  Plus,
  Minus,
  Grid,
  List,
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@pulse/core-logic';
import type { Product } from '@pulse/core-logic';
import JsBarcode from 'jsbarcode';

interface LabelSettings {
  width: number;  // mm
  height: number; // mm
  showBarcode: boolean;
  showPrice: boolean;
  showName: boolean;
  showSku: boolean;
  fontSize: 'small' | 'medium' | 'large';
  copies: number;
}

const DEFAULT_SETTINGS: LabelSettings = {
  width: 50,
  height: 25,
  showBarcode: true,
  showPrice: true,
  showName: true,
  showSku: false,
  fontSize: 'medium',
  copies: 1,
};

const LABEL_PRESETS = [
  { name: 'Small (38×25mm)', width: 38, height: 25 },
  { name: 'Medium (50×25mm)', width: 50, height: 25 },
  { name: 'Large (60×40mm)', width: 60, height: 40 },
  { name: 'Shelf Tag (80×50mm)', width: 80, height: 50 },
];

export const LabelPrintingScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [settings, setSettings] = useState<LabelSettings>(DEFAULT_SETTINGS);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadProducts();
    // Load saved settings
    const savedSettings = localStorage.getItem('pulse-label-settings');
    if (savedSettings) {
      setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
    }
  }, []);

  const loadProducts = async () => {
    try {
      const allProducts = await db.products.toArray();
      setProducts(allProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = (newSettings: LabelSettings) => {
    setSettings(newSettings);
    localStorage.setItem('pulse-label-settings', JSON.stringify(newSettings));
  };

  const filteredProducts = products.filter(product => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(term) ||
      product.sku?.toLowerCase().includes(term) ||
      product.barcode?.toLowerCase().includes(term)
    );
  });

  const toggleProduct = (productId: string) => {
    const newSelected = new Map(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.set(productId, settings.copies);
    }
    setSelectedProducts(newSelected);
  };

  const updateQuantity = (productId: string, delta: number) => {
    const newSelected = new Map(selectedProducts);
    const current = newSelected.get(productId) || 0;
    const newValue = Math.max(1, current + delta);
    newSelected.set(productId, newValue);
    setSelectedProducts(newSelected);
  };

  const selectAll = () => {
    const newSelected = new Map<string, number>();
    filteredProducts.forEach(p => newSelected.set(p.id, settings.copies));
    setSelectedProducts(newSelected);
  };

  const clearSelection = () => {
    setSelectedProducts(new Map());
  };

  const getTotalLabels = () => {
    let total = 0;
    selectedProducts.forEach(qty => total += qty);
    return total;
  };

  const generateLabelHTML = (product: Product): string => {
    const fontSizes = {
      small: { name: '10px', price: '14px', sku: '8px' },
      medium: { name: '12px', price: '18px', sku: '10px' },
      large: { name: '14px', price: '24px', sku: '12px' },
    };
    const sizes = fontSizes[settings.fontSize];

    // Generate barcode SVG
    let barcodeHtml = '';
    if (settings.showBarcode && product.barcode) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      try {
        JsBarcode(svg, product.barcode, {
          format: 'CODE128',
          width: 1.5,
          height: 30,
          displayValue: true,
          fontSize: 10,
          margin: 2,
        });
        barcodeHtml = svg.outerHTML;
      } catch {
        barcodeHtml = `<div style="font-size: 10px; color: #666;">${product.barcode}</div>`;
      }
    }

    return `
      <div style="
        width: ${settings.width}mm;
        height: ${settings.height}mm;
        padding: 2mm;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 1px solid #ddd;
        font-family: Arial, sans-serif;
        page-break-inside: avoid;
      ">
        ${settings.showName ? `<div style="font-size: ${sizes.name}; font-weight: bold; text-align: center; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;">${product.name}</div>` : ''}
        ${settings.showSku && product.sku ? `<div style="font-size: ${sizes.sku}; color: #666; margin-bottom: 2px;">SKU: ${product.sku}</div>` : ''}
        ${settings.showPrice ? `<div style="font-size: ${sizes.price}; font-weight: bold; margin-bottom: 4px;">${product.sale_price.toFixed(2)} BGN</div>` : ''}
        ${barcodeHtml}
      </div>
    `;
  };

  const handlePrint = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Please select at least one product');
      return;
    }

    setPrinting(true);
    try {
      // Generate print content
      let labelsHtml = '';
      
      for (const [productId, quantity] of selectedProducts.entries()) {
        const product = products.find(p => p.id === productId);
        if (!product) continue;
        
        for (let i = 0; i < quantity; i++) {
          labelsHtml += generateLabelHTML(product);
        }
      }

      // Create print window
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        toast.error('Please allow popups to print labels');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Product Labels</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              @page { margin: 5mm; }
            }
            body {
              display: flex;
              flex-wrap: wrap;
              gap: 2mm;
              padding: 5mm;
              font-family: Arial, sans-serif;
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();

      toast.success(`Printing ${getTotalLabels()} labels...`);
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print labels');
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl shadow-lg shadow-cyan-500/20">
              <Tag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Label Printing</h1>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Print barcode labels and price tags
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                showSettings 
                  ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Settings</span>
            </button>
            
            <button
              onClick={handlePrint}
              disabled={printing || selectedProducts.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50"
            >
              {printing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span className="font-medium">Print ({getTotalLabels()})</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search & Controls */}
          <div className="flex-shrink-0 p-4 bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name, SKU, or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Clear
                </button>
                <div className="h-6 w-px bg-gray-200 dark:bg-slate-700" />
                <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow' : ''}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow' : ''}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="flex-1 overflow-y-auto p-4">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    selected={selectedProducts.has(product.id)}
                    quantity={selectedProducts.get(product.id) || 0}
                    onToggle={() => toggleProduct(product.id)}
                    onQuantityChange={(delta) => updateQuantity(product.id, delta)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map(product => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    selected={selectedProducts.has(product.id)}
                    quantity={selectedProducts.get(product.id) || 0}
                    onToggle={() => toggleProduct(product.id)}
                    onQuantityChange={(delta) => updateQuantity(product.id, delta)}
                  />
                ))}
              </div>
            )}
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-gray-400 dark:text-slate-500">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No products found</p>
              </div>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-80 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Label Settings</h3>
            
            <div className="space-y-6">
              {/* Preset Sizes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Label Size
                </label>
                <div className="space-y-2">
                  {LABEL_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => saveSettings({ ...settings, width: preset.width, height: preset.height })}
                      className={`w-full px-3 py-2 text-left text-sm rounded-lg transition-colors ${
                        settings.width === preset.width && settings.height === preset.height
                          ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400'
                          : 'bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Custom Size
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Width (mm)</label>
                    <input
                      type="number"
                      value={settings.width}
                      onChange={(e) => saveSettings({ ...settings, width: parseInt(e.target.value) || 50 })}
                      min={20}
                      max={100}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Height (mm)</label>
                    <input
                      type="number"
                      value={settings.height}
                      onChange={(e) => saveSettings({ ...settings, height: parseInt(e.target.value) || 25 })}
                      min={15}
                      max={80}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Show Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Display Options
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'showName', label: 'Product Name' },
                    { key: 'showPrice', label: 'Price' },
                    { key: 'showBarcode', label: 'Barcode' },
                    { key: 'showSku', label: 'SKU' },
                  ].map(option => (
                    <label key={option.key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings[option.key as keyof LabelSettings] as boolean}
                        onChange={(e) => saveSettings({ ...settings, [option.key]: e.target.checked })}
                        className="w-4 h-4 text-cyan-600 rounded border-gray-300 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-slate-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Font Size
                </label>
                <select
                  value={settings.fontSize}
                  onChange={(e) => saveSettings({ ...settings, fontSize: e.target.value as LabelSettings['fontSize'] })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              {/* Default Copies */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Default Copies
                </label>
                <input
                  type="number"
                  value={settings.copies}
                  onChange={(e) => saveSettings({ ...settings, copies: Math.max(1, parseInt(e.target.value) || 1) })}
                  min={1}
                  max={100}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm"
                />
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Label Preview
                </label>
                <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white flex justify-center">
                  <div 
                    style={{
                      width: `${settings.width * 2}px`,
                      height: `${settings.height * 2}px`,
                      border: '1px solid #ddd',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      fontSize: settings.fontSize === 'small' ? '8px' : settings.fontSize === 'medium' ? '10px' : '12px',
                    }}
                  >
                    {settings.showName && <div style={{ fontWeight: 'bold' }}>Product Name</div>}
                    {settings.showSku && <div style={{ fontSize: '80%', color: '#666' }}>SKU: 12345</div>}
                    {settings.showPrice && <div style={{ fontWeight: 'bold', fontSize: '120%' }}>9.99 BGN</div>}
                    {settings.showBarcode && (
                      <div style={{ marginTop: '4px' }}>
                        <Barcode className="w-12 h-6" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Product Card Component
const ProductCard: React.FC<{
  product: Product;
  selected: boolean;
  quantity: number;
  onToggle: () => void;
  onQuantityChange: (delta: number) => void;
}> = ({ product, selected, quantity, onToggle, onQuantityChange }) => {
  return (
    <div
      className={`relative bg-white dark:bg-slate-800 rounded-xl border-2 p-4 cursor-pointer transition-all ${
        selected
          ? 'border-cyan-500 shadow-lg shadow-cyan-500/10'
          : 'border-gray-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-700'
      }`}
      onClick={onToggle}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className="text-center mb-3">
        <Package className="w-10 h-10 mx-auto text-gray-300 dark:text-slate-600" />
      </div>
      
      <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate mb-1">
        {product.name}
      </h3>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-slate-400">
          {product.sku || product.barcode || '-'}
        </span>
        <span className="font-bold text-cyan-600 dark:text-cyan-400">
          {product.sale_price.toFixed(2)}
        </span>
      </div>
      
      {selected && (
        <div 
          className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onQuantityChange(-1)}
            className="p-1 bg-gray-100 dark:bg-slate-700 rounded hover:bg-gray-200 dark:hover:bg-slate-600"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-medium">{quantity}</span>
          <button
            onClick={() => onQuantityChange(1)}
            className="p-1 bg-gray-100 dark:bg-slate-700 rounded hover:bg-gray-200 dark:hover:bg-slate-600"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

// Product Row Component
const ProductRow: React.FC<{
  product: Product;
  selected: boolean;
  quantity: number;
  onToggle: () => void;
  onQuantityChange: (delta: number) => void;
}> = ({ product, selected, quantity, onToggle, onQuantityChange }) => {
  return (
    <div
      className={`flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border-2 cursor-pointer transition-all ${
        selected
          ? 'border-cyan-500'
          : 'border-gray-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-700'
      }`}
      onClick={onToggle}
    >
      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
        selected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-300 dark:border-slate-600'
      }`}>
        {selected && <Check className="w-4 h-4 text-white" />}
      </div>
      
      <Package className="w-8 h-8 text-gray-300 dark:text-slate-600" />
      
      <div className="flex-1">
        <h3 className="font-medium text-gray-900 dark:text-white">{product.name}</h3>
        <div className="text-sm text-gray-500 dark:text-slate-400">
          {product.sku && `SKU: ${product.sku}`}
          {product.sku && product.barcode && ' • '}
          {product.barcode && `Barcode: ${product.barcode}`}
        </div>
      </div>
      
      <div className="text-right">
        <div className="font-bold text-cyan-600 dark:text-cyan-400">{product.sale_price.toFixed(2)} BGN</div>
      </div>
      
      {selected && (
        <div 
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onQuantityChange(-1)}
            className="p-1.5 bg-gray-100 dark:bg-slate-700 rounded hover:bg-gray-200 dark:hover:bg-slate-600"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-10 text-center font-medium">{quantity}</span>
          <button
            onClick={() => onQuantityChange(1)}
            className="p-1.5 bg-gray-100 dark:bg-slate-700 rounded hover:bg-gray-200 dark:hover:bg-slate-600"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default LabelPrintingScreen;
