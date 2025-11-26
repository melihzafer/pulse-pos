import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { Product, db } from '@pulse/core-logic';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { ProductModal } from './ProductModal';

export const InventoryGrid: React.FC = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof Product>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const allProducts = await db.products.toArray();
      setProducts(allProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingProduct(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('common.deleteConfirm'))) {
      await db.products.delete(id);
      loadProducts();
    }
  };

  const handleSave = async (productData: Partial<Product>) => {
    try {
      if (editingProduct) {
        await db.products.update(editingProduct.id, {
          ...productData,
          updated_at: new Date().toISOString()
        });
      } else {
        await db.products.add({
          id: crypto.randomUUID(),
          workspace_id: '00000000-0000-0000-0000-000000000000', // TODO: Get from settings
          ...productData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Product);
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Failed to save product');
    }
  };

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    return 0;
  });

  const getStockStatus = (quantity: number, minLevel: number) => {
    if (quantity === 0) return { label: t('inventory.status.outOfStock'), color: 'text-red-500 bg-red-500/10' };
    if (quantity <= minLevel) return { label: t('inventory.status.lowStock'), color: 'text-orange-500 bg-orange-500/10' };
    return { label: t('inventory.status.inStock'), color: 'text-green-500 bg-green-500/10' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-blue-600 dark:text-blue-400 text-xl">{t('inventory.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('inventory.title')}</h2>
        <button 
          onClick={handleAdd}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-2xl transition-all flex items-center gap-2"
        >
          <Plus size={20} />
          {t('inventory.addProduct')}
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl">
        <table className="w-full">
          <thead className="sticky top-0 bg-gradient-to-r from-gray-50 to-blue-50/30 dark:from-slate-900 dark:to-blue-950/30 z-10 backdrop-blur-sm">
            <tr className="border-b border-gray-200 dark:border-slate-700">
              <th 
                onClick={() => handleSort('name')}
                className="text-left p-3 text-sm font-semibold text-gray-600 dark:text-slate-300 cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {t('inventory.table.name')} {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('barcode')}
                className="text-left p-3 text-sm font-semibold text-gray-600 dark:text-slate-300 cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {t('inventory.table.barcode')} {sortField === 'barcode' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('quantity_on_hand')}
                className="text-right p-3 text-sm font-semibold text-gray-600 dark:text-slate-300 cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {t('inventory.table.stock')} {sortField === 'quantity_on_hand' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('cost_price')}
                className="text-right p-3 text-sm font-semibold text-gray-600 dark:text-slate-300 cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {t('inventory.table.cost')} {sortField === 'cost_price' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('sale_price')}
                className="text-right p-3 text-sm font-semibold text-gray-600 dark:text-slate-300 cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {t('inventory.table.price')} {sortField === 'sale_price' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-center p-3 text-sm font-semibold text-gray-600 dark:text-slate-300">
                {t('inventory.table.status')}
              </th>
              <th className="text-right p-3 text-sm font-semibold text-gray-600 dark:text-slate-300">
                {t('inventory.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((product) => {
              const stockQty = product.quantity_on_hand ?? 0;
              const status = getStockStatus(stockQty, product.min_stock_level);
              return (
                <tr key={product.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 text-gray-900 dark:text-white font-medium">{product.name}</td>
                  <td className="p-3 text-gray-500 dark:text-slate-400 font-mono text-sm">{product.barcode || '-'}</td>
                  <td className="p-3 text-right font-mono text-gray-900 dark:text-white">
                    {typeof product.quantity_on_hand === 'number' ? product.quantity_on_hand : (
                      <span className="text-amber-600 dark:text-amber-400">Stok Yok</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono text-gray-500 dark:text-slate-400">{product.cost_price.toFixed(2)}</td>
                  <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400 font-semibold">{product.sale_price.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={clsx('px-2 py-1 rounded-lg text-xs font-medium', status.color)}>
                      {status.label}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(product)}
                        className="p-2 text-gray-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-gray-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 dark:text-slate-500 text-lg">{t('inventory.empty.title')}</p>
            <p className="text-gray-500 dark:text-slate-600 text-sm mt-2">{t('inventory.empty.subtitle')}</p>
          </div>
        )}
      </div>

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        onSave={handleSave}
      />
    </div>
  );
};
