import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { db, Product } from '@pulse/core-logic';

export const LowStockAlerts: React.FC = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const allProducts = await db.products.toArray();
      const lowStock = allProducts
        .filter((p) => {
          const stockQty = p.quantity_on_hand ?? 0;
          const minLevel = p.min_stock_level ?? 0;
          return stockQty <= minLevel;
        })
        .sort((a, b) => (a.quantity_on_hand ?? 0) - (b.quantity_on_hand ?? 0));

      setProducts(lowStock);
    } catch (error) {
      console.error('Failed to load low stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (product: Product): 'critical' | 'warning' | 'ok' => {
    const stockQty = product.quantity_on_hand ?? 0;
    const minLevel = product.min_stock_level ?? 0;
    if (stockQty === 0) return 'critical';
    if (stockQty <= minLevel * 0.5) return 'warning';
    return 'ok';
  };

  const getStatusColor = (status: 'critical' | 'warning' | 'ok') => {
    switch (status) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400';
      case 'warning':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400';
      default:
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400';
    }
  };

  const getStatusIcon = (status: 'critical' | 'warning' | 'ok') => {
    switch (status) {
      case 'critical':
        return <AlertTriangle size={20} className="text-red-600" />;
      case 'warning':
        return <TrendingDown size={20} className="text-orange-600" />;
      default:
        return <Package size={20} className="text-yellow-600" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <AlertTriangle size={20} className="text-orange-600" />
          {t('analytics.lowStockAlerts.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('analytics.lowStockAlerts.subtitle')}
        </p>
      </div>

      {products.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Package size={32} className="text-green-600" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {t('analytics.lowStockAlerts.allStocked')}
          </p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">{t('analytics.lowStockAlerts.critical')}</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                {products.filter((p) => getStockStatus(p) === 'critical').length}
              </p>
            </div>
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">{t('analytics.lowStockAlerts.warning')}</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {products.filter((p) => getStockStatus(p) === 'warning').length}
              </p>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mb-1">{t('analytics.lowStockAlerts.low')}</p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                {products.filter((p) => getStockStatus(p) === 'ok').length}
              </p>
            </div>
          </div>

          {/* Product List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {products.map((product) => {
              const status = getStockStatus(product);
              return (
                <div
                  key={product.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${getStatusColor(status)}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('analytics.lowStockAlerts.minLevel')} {product.min_stock_level ?? 0} {t('analytics.lowStockAlerts.units')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {typeof product.quantity_on_hand === 'number' ? product.quantity_on_hand : (
                        <span className="text-red-600 dark:text-red-400 text-base">Stok Yok</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('analytics.lowStockAlerts.inStock')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
