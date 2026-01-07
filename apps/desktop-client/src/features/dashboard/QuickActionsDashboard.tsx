import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  Clock,
  DollarSign,
  AlertTriangle,
  Star,
  Search,
  Barcode,
  Gift,
  FileText,
  Truck,
  UserPlus,
  Calculator,
  History,
  Layers,
  Receipt,
  Wallet,
  RefreshCw,
  Grid3X3,
  Keyboard,
  Volume2,
  VolumeX,
  Users,
  TrendingUp,
  PackageMinus,
  X,
} from 'lucide-react';
import { db } from '@pulse/core-logic';
import { format } from 'date-fns';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useSettingsStore } from '../settings/store';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  tabId?: string;
  action?: () => void;
  color: string;
  category: 'sales' | 'inventory' | 'customers' | 'reports' | 'settings';
}

interface RecentSale {
  id: string;
  receipt_number: string;
  total: number;
  created_at: string;
  items_count: number;
}

interface FavoriteProduct {
  id: string;
  name: string;
  barcode?: string;
  sale_price: number;
  stock_quantity: number;
  sales_count: number;
}

interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  lowStockCount: number;
  pendingOrders: number;
}

interface QuickActionsDashboardProps {
  onNavigate?: (tab: string) => void;
}

export const QuickActionsDashboard: React.FC<QuickActionsDashboardProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { workspaceId } = useSettingsStore();

  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayTransactions: 0,
    lowStockCount: 0,
    pendingOrders: 0,
  });
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>([]);
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [scannerMode, setScannerMode] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCalculator, setShowCalculator] = useState(false);

  // Helper function for navigation
  const navigateTo = useCallback((tabId: string) => {
    if (onNavigate) {
      onNavigate(tabId);
    }
  }, [onNavigate]);

  // Handle cash drawer
  const handleOpenCashDrawer = useCallback(() => {
    toast.info(t('dashboard.openingDrawer', 'Opening cash drawer...'));
    // In real implementation, send command to printer/drawer
  }, [t]);

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      id: 'new-sale',
      label: t('dashboard.newSale', 'New Sale'),
      icon: <ShoppingCart className="w-8 h-8" />,
      tabId: 'pos',
      color: 'from-green-500 to-emerald-600',
      category: 'sales',
    },
    {
      id: 'quick-refund',
      label: t('dashboard.quickRefund', 'Refund'),
      icon: <RefreshCw className="w-8 h-8" />,
      tabId: 'pos',
      color: 'from-red-500 to-rose-600',
      category: 'sales',
    },
    {
      id: 'gift-cards',
      label: t('dashboard.giftCards', 'Gift Cards'),
      icon: <Gift className="w-8 h-8" />,
      tabId: 'promotions',
      color: 'from-purple-500 to-violet-600',
      category: 'sales',
    },
    {
      id: 'layaway',
      label: t('dashboard.layaway', 'Layaway'),
      icon: <Layers className="w-8 h-8" />,
      tabId: 'layaway',
      color: 'from-amber-500 to-orange-600',
      category: 'sales',
    },
    {
      id: 'customers',
      label: t('dashboard.customers', 'Customers'),
      icon: <Users className="w-8 h-8" />,
      tabId: 'pos',
      color: 'from-blue-500 to-indigo-600',
      category: 'customers',
    },
    {
      id: 'add-customer',
      label: t('dashboard.addCustomer', 'New Customer'),
      icon: <UserPlus className="w-8 h-8" />,
      tabId: 'pos',
      color: 'from-cyan-500 to-blue-600',
      category: 'customers',
    },
    {
      id: 'inventory',
      label: t('dashboard.inventory', 'Inventory'),
      icon: <Package className="w-8 h-8" />,
      tabId: 'inventory',
      color: 'from-teal-500 to-cyan-600',
      category: 'inventory',
    },
    {
      id: 'stock-adjust',
      label: t('dashboard.stockAdjust', 'Stock Adjust'),
      icon: <PackageMinus className="w-8 h-8" />,
      tabId: 'inventory',
      color: 'from-orange-500 to-red-600',
      category: 'inventory',
    },
    {
      id: 'purchase-orders',
      label: t('dashboard.purchaseOrders', 'Purchase Orders'),
      icon: <Truck className="w-8 h-8" />,
      tabId: 'purchase-orders',
      color: 'from-indigo-500 to-purple-600',
      category: 'inventory',
    },
    {
      id: 'analytics',
      label: t('dashboard.analytics', 'Analytics'),
      icon: <BarChart3 className="w-8 h-8" />,
      tabId: 'analytics',
      color: 'from-pink-500 to-rose-600',
      category: 'reports',
    },
    {
      id: 'daily-report',
      label: t('dashboard.dailyReport', 'Daily Report'),
      icon: <FileText className="w-8 h-8" />,
      tabId: 'analytics',
      color: 'from-slate-500 to-gray-600',
      category: 'reports',
    },
    {
      id: 'cash-drawer',
      label: t('dashboard.cashDrawer', 'Cash Drawer'),
      icon: <Wallet className="w-8 h-8" />,
      action: handleOpenCashDrawer,
      color: 'from-emerald-500 to-green-600',
      category: 'sales',
    },
    {
      id: 'calculator',
      label: t('dashboard.calculator', 'Calculator'),
      icon: <Calculator className="w-8 h-8" />,
      action: () => setShowCalculator(true),
      color: 'from-gray-500 to-slate-600',
      category: 'sales',
    },
    {
      id: 'settings',
      label: t('dashboard.settings', 'Settings'),
      icon: <Settings className="w-8 h-8" />,
      tabId: 'settings',
      color: 'from-zinc-500 to-neutral-600',
      category: 'settings',
    },
  ];

  // Handle barcode scan
  const handleBarcodeScanned = useCallback(
    async (barcode: string) => {
      if (soundEnabled) {
        // Play beep sound (browser beep)
        try {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const audioContext = new AudioContextClass();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 1000;
          oscillator.type = 'sine';
          gainNode.gain.value = 0.1;
          oscillator.start();
          setTimeout(() => oscillator.stop(), 100);
        } catch (e) {
          // Audio context not available
        }
      }

      try {
        const product = await db.products.where('barcode').equals(barcode).first();

        if (product) {
          toast.success(
            <div className="flex items-center gap-3">
              <Barcode className="w-5 h-5" />
              <div>
                <p className="font-medium">{product.name}</p>
                <p className="text-sm opacity-80">{product.sale_price.toFixed(2)} BGN - Go to POS</p>
              </div>
            </div>
          );
          // Navigate to POS
          navigateTo('pos');
        } else {
          toast.error(
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-medium">{t('dashboard.unknownBarcode', 'Unknown Barcode')}</p>
                <p className="text-sm opacity-80">{barcode}</p>
              </div>
            </div>,
            {
              action: {
                label: t('dashboard.createProduct', 'Create Product'),
                onClick: () => navigateTo('inventory'),
              },
            }
          );
        }
      } catch (error) {
        console.error('Barcode lookup failed:', error);
      }
    },
    [soundEnabled, navigateTo, t]
  );

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, [workspaceId]);

  // Barcode scanner listener
  useEffect(() => {
    if (!scannerMode) return;

    let buffer = '';
    let lastKeyTime = 0;
    const SCANNER_THRESHOLD = 50; // ms between keystrokes for scanner

    const handleKeyPress = (e: KeyboardEvent) => {
      const now = Date.now();

      // If typing in an input field, ignore
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Scanner sends keys rapidly
      if (now - lastKeyTime > SCANNER_THRESHOLD) {
        buffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          handleBarcodeScanned(buffer);
        }
        buffer = '';
        setBarcodeBuffer('');
      } else if (e.key.length === 1) {
        buffer += e.key;
        setBarcodeBuffer(buffer);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [scannerMode, handleBarcodeScanned]);

  const loadDashboardData = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Today's sales
      const todaySalesData = await db.sales
        .where('workspace_id')
        .equals(workspaceId)
        .filter((sale) => {
          const saleDate = sale.created_at ? new Date(sale.created_at) : new Date(0);
          return saleDate >= today;
        })
        .toArray();

      const todaySales = todaySalesData.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const todayTransactions = todaySalesData.length;

      // Low stock count
      const products = await db.products
        .where('workspace_id')
        .equals(workspaceId)
        .toArray();
      const lowStockCount = products.filter((p) => {
        const qty = p.stock_quantity ?? 0;
        const minStock = p.min_stock_level ?? 5;
        return qty <= minStock;
      }).length;

      // Pending orders
      let pendingOrders = 0;
      try {
        pendingOrders = await db.purchase_orders
          .where('workspace_id')
          .equals(workspaceId)
          .filter((po) => ['draft', 'sent', 'confirmed'].includes(po.status))
          .count();
      } catch {
        // Table may not exist
      }

      setStats({
        todaySales,
        todayTransactions,
        lowStockCount,
        pendingOrders,
      });

      // Recent sales (last 5)
      const recent = await db.sales
        .where('workspace_id')
        .equals(workspaceId)
        .sortBy('created_at'); // Dexie returns array sorted by key
        
      const recentTop5 = recent.reverse().slice(0, 5);

      const recentWithCounts = await Promise.all(
        recentTop5.map(async (sale) => {
          const items = await db.sale_items.where('sale_id').equals(sale.id!).count();
          return {
            id: sale.id!,
            receipt_number: (sale as { receipt_number?: string }).receipt_number || `#${sale.id?.slice(0, 8)}`,
            total: sale.total_amount || 0,
            created_at: sale.created_at || new Date().toISOString(),
            items_count: items,
          };
        })
      );
      setRecentSales(recentWithCounts);

      // Favorite products (most sold - simplified)
      const saleItems = await db.sale_items.toArray();
      const productSales: Record<string, number> = {};
      saleItems.forEach((item) => {
        productSales[item.product_id] = (productSales[item.product_id] || 0) + item.quantity;
      });

      const sortedProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

      const favorites = await Promise.all(
        sortedProducts.map(async ([productId, salesCount]) => {
          const product = await db.products.get(productId);
          if (!product) return null;
          return {
            id: product.id!,
            name: product.name,
            barcode: product.barcode,
            sale_price: product.sale_price,
            stock_quantity: (product as any).stock_quantity ?? 0,
            sales_count: salesCount,
          };
        })
      );
      setFavoriteProducts(favorites.filter(Boolean) as FavoriteProduct[]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.tabId) {
      navigateTo(action.tabId);
    } else if (action.action) {
      action.action();
    }
  };

  const handleProductClick = (product: FavoriteProduct) => {
    // Navigate to POS - in future could pass product ID
    navigateTo('pos');
    toast.info(`Selected: ${product.name}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Check if it looks like a barcode
      if (/^\d{4,}$/.test(searchQuery.trim())) {
        handleBarcodeScanned(searchQuery.trim());
      } else {
        // Navigate to POS for product search
        navigateTo('pos');
        toast.info(`Searching for: ${searchQuery.trim()}`);
      }
      setSearchQuery('');
    }
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.welcome', 'Welcome to Pulse POS')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {format(currentTime, 'EEEE, MMMM d, yyyy • HH:mm:ss')}
          </p>
        </div>

        {/* Search & Scanner Mode */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('dashboard.searchOrScan', 'Search products or scan barcode...')}
              className="pl-10 pr-4 py-3 w-80 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            {barcodeBuffer && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-sm text-indigo-500">
                <Barcode className="w-4 h-4 animate-pulse" />
                {barcodeBuffer}
              </div>
            )}
          </form>

          <button
            onClick={() => setScannerMode(!scannerMode)}
            className={clsx(
              'p-3 rounded-xl transition-all',
              scannerMode
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            )}
            title={scannerMode ? 'Scanner Active' : 'Scanner Disabled'}
          >
            <Barcode className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={clsx(
              'p-3 rounded-xl transition-all',
              soundEnabled
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            )}
            title={soundEnabled ? 'Sound On' : 'Sound Off'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('dashboard.todaySales', "Today's Sales")}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.todaySales.toFixed(2)} BGN
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('dashboard.transactions', 'Transactions')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.todayTransactions}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Receipt className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-slate-700 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => navigateTo('inventory')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('dashboard.lowStock', 'Low Stock')}
              </p>
              <p
                className={clsx(
                  'text-2xl font-bold mt-1',
                  stats.lowStockCount > 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'
                )}
              >
                {stats.lowStockCount} {t('dashboard.items', 'items')}
              </p>
            </div>
            <div
              className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                stats.lowStockCount > 0
                  ? 'bg-gradient-to-br from-red-500 to-rose-600'
                  : 'bg-gradient-to-br from-gray-400 to-gray-500'
              )}
            >
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-slate-700 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => navigateTo('purchase-orders')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('dashboard.pendingOrders', 'Pending POs')}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.pendingOrders}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Quick Actions Grid */}
        <div className="xl:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Grid3X3 className="w-5 h-5" />
                {t('dashboard.quickActions', 'Quick Actions')}
              </h2>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  className={`group p-4 rounded-xl bg-gradient-to-br ${action.color} text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex flex-col items-center gap-2`}
                >
                  <div className="transform group-hover:scale-110 transition-transform">{action.icon}</div>
                  <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Favorite Products */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                {t('dashboard.favoriteProducts', 'Quick Add - Top Products')}
              </h2>
              <span className="text-sm text-gray-500">{t('dashboard.clickToAdd', 'Click to add to POS')}</span>
            </div>

            {favoriteProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>{t('dashboard.noFavorites', 'No sales data yet. Start selling to see top products!')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {favoriteProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="group p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border-2 border-transparent hover:border-indigo-500 transition-all text-left"
                  >
                    <p className="font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {product.name}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {product.sale_price.toFixed(2)}
                      </span>
                      <span
                        className={clsx(
                          'text-xs px-2 py-1 rounded-full',
                          product.stock_quantity > 10
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : product.stock_quantity > 0
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        )}
                      >
                        {product.stock_quantity}
                      </span>
                    </div>
                    {product.barcode && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Barcode className="w-3 h-3" />
                        {product.barcode}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Shift Info */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t('dashboard.quickInfo', 'Quick Info')}
              </h3>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                {t('dashboard.active', 'Active')}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="opacity-80">{t('dashboard.date', 'Date')}</span>
                <span className="font-medium">{format(currentTime, 'MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-80">{t('dashboard.time', 'Time')}</span>
                <span className="font-medium font-mono">{format(currentTime, 'HH:mm:ss')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-80">{t('dashboard.scanner', 'Scanner')}</span>
                <span className="font-medium">{scannerMode ? '✓ Active' : '✗ Off'}</span>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5" />
                {t('dashboard.recentTransactions', 'Recent Sales')}
              </h3>
              <button onClick={() => navigateTo('analytics')} className="text-sm text-indigo-500 hover:text-indigo-600">
                {t('dashboard.viewAll', 'View All')}
              </button>
            </div>

            <div className="space-y-3">
              {recentSales.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  {t('dashboard.noTransactions', 'No transactions yet')}
                </p>
              ) : (
                recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{sale.receipt_number}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(sale.created_at), 'HH:mm')} • {sale.items_count} items
                      </p>
                    </div>
                    <span className="font-bold text-green-600 dark:text-green-400">+{sale.total.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Keyboard className="w-5 h-5" />
              {t('dashboard.shortcuts', 'Keyboard Shortcuts')}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">New Sale</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">F1</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Payment</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">F2</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Search</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Ctrl+F</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Inventory</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">F5</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Barcode</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Scan</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calculator Modal */}
      {showCalculator && <CalculatorModal onClose={() => setShowCalculator(false)} />}
    </div>
  );
};

// Simple Calculator Modal
const CalculatorModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState(true);

  const handleNumber = (num: string) => {
    if (newNumber) {
      setDisplay(num);
      setNewNumber(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleOperation = (op: string) => {
    setPreviousValue(parseFloat(display));
    setOperation(op);
    setNewNumber(true);
  };

  const handleEquals = () => {
    if (previousValue === null || operation === null) return;
    const current = parseFloat(display);
    let result = 0;
    switch (operation) {
      case '+':
        result = previousValue + current;
        break;
      case '-':
        result = previousValue - current;
        break;
      case '*':
        result = previousValue * current;
        break;
      case '/':
        result = previousValue / current;
        break;
    }
    setDisplay(result.toString());
    setPreviousValue(null);
    setOperation(null);
    setNewNumber(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setNewNumber(true);
  };

  const buttons = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+'],
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Calculator
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="mb-4">
          <div className="text-right text-3xl font-mono font-bold text-gray-900 dark:text-white p-4 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden">
            {display.length > 12 ? parseFloat(display).toExponential(6) : display}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={handleClear}
            className="col-span-2 p-4 text-xl font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
          >
            C
          </button>
          <button
            onClick={() => setDisplay(display.slice(0, -1) || '0')}
            className="col-span-2 p-4 text-xl font-bold bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-xl hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
          >
            ⌫
          </button>
          {buttons.map((row) =>
            row.map((btn) => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === '=') handleEquals();
                  else if (['+', '-', '*', '/'].includes(btn)) handleOperation(btn);
                  else handleNumber(btn);
                }}
                className={clsx(
                  'p-4 text-xl font-bold rounded-xl transition-colors',
                  ['+', '-', '*', '/'].includes(btn)
                    ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                    : btn === '='
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                )}
              >
                {btn}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickActionsDashboard;
