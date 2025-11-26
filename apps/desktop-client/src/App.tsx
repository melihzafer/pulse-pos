import { useState, useEffect } from 'react';
import { Sidebar } from './layouts/Sidebar';
import { POSScreen } from './features/pos/POSScreen';
import { InventoryGrid } from './features/inventory/InventoryGrid';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { DashboardScreen } from './features/dashboard/DashboardScreen';
import { PromotionsScreen } from './features/promotions/PromotionsScreen';
import { AnalyticsScreen } from './features/analytics/AnalyticsScreen';
import { SupplierManagementScreen } from './features/suppliers';
import { PurchaseOrderScreen } from './features/purchase-orders';
import { LayawayScreen } from './features/layaway/LayawayScreen';
import { LocationManagementScreen } from './features/locations/LocationManagementScreen';
import { StockTransferScreen } from './features/locations/StockTransferScreen';
import { MultiLocationDashboard } from './features/locations/MultiLocationDashboard';
import { LocationProfitLossReport } from './features/locations/LocationProfitLossReport';
import { LoginScreen } from './features/auth/LoginScreen';
import { Toaster } from 'sonner';
import { CustomerDisplayScreen } from './features/customer-display/CustomerDisplayScreen';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuthStore, db } from '@pulse/core-logic';
import { sendNotification } from './utils/notifications';
import { seedDatabase } from './utils/seedData';

function App() {
  const { t } = useTranslation();
  const { isAuthenticated, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('pos');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const isCustomerDisplay = new URLSearchParams(window.location.search).get('mode') === 'customer-display';

  // IMPORTANT: All hooks must be called before any conditional returns
  // Auto-seed database with sample products if empty
  useEffect(() => {
    const checkAndSeedDatabase = async () => {
      try {
        const productCount = await db.products.count();
        const customerCount = await db.customers.count();
        
        console.log(`📊 Mevcut durum: ${productCount} ürün, ${customerCount} müşteri`);
        
        // Check if products have the new schema by checking first product
        let needsSchemaUpdate = false;
        if (productCount > 0) {
          const firstProduct = await db.products.limit(1).first();
          // If product doesn't have quantity_on_hand field, it's old schema
          if (firstProduct && !('quantity_on_hand' in firstProduct)) {
            console.log('⚠️  Eski schema tespit edildi (quantity_on_hand field yok)');
            needsSchemaUpdate = true;
          }
        }
        
        // Re-seed if: no products, no customers, OR old schema detected
        if (productCount === 0 || customerCount === 0 || needsSchemaUpdate) {
          console.log('🔄 Veritabanı yeniden yükleniyor (schema güncellemesi)...');
          const result = await seedDatabase();
          console.log('✅ Örnek veriler başarıyla yüklendi!');
          console.log(`  - ${await db.products.count()} ürün`);
          console.log(`  - ${await db.customers.count()} müşteri`);
          
          // Show success notification
          sendNotification({
            title: 'Database Refreshed',
            message: 'Sample products and customers reloaded with latest schema!',
            type: 'success',
            category: 'system'
          });
        } else {
          console.log(`✓ Veritabanı hazır (yeni schema): ${productCount} ürün, ${customerCount} müşteri`);
        }
      } catch (error) {
        console.error('❌ Veritabanı seed hatası:', error);
      }
    };

    if (isAuthenticated) {
      checkAndSeedDatabase();
    }
  }, [isAuthenticated]);

  // Listen for sync errors
  useEffect(() => {
    const handleSyncError = (_event: Event) => {
      sendNotification({
        title: t('notifications.syncFailed', 'Sync Failed'),
        message: t('notifications.syncFailedMessage', 'Failed to sync with server. Check your connection.'),
        type: 'error',
        category: 'failedSync'
      });
    };

    window.addEventListener('sync-error', handleSyncError);
    return () => window.removeEventListener('sync-error', handleSyncError);
  }, [t]);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('pulse-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setTheme(settings.theme || 'light');
      } catch (e) {
        console.error('Failed to load theme:', e);
      }
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // If not customer display and not authenticated, show login
  if (!isCustomerDisplay && !isAuthenticated) {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <Toaster position="top-center" richColors />
        <LoginScreen />
      </div>
    );
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    // Save to localStorage
    const savedSettings = localStorage.getItem('pulse-settings');
    const settings = savedSettings ? JSON.parse(savedSettings) : {};
    localStorage.setItem('pulse-settings', JSON.stringify({ ...settings, theme: newTheme }));
  };

  if (isCustomerDisplay) {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <CustomerDisplayScreen />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 dark:bg-slate-900 dark:text-gray-100 font-sans overflow-hidden">
      <Toaster position="top-center" richColors />
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        theme={theme} 
        onThemeToggle={toggleTheme}
        onLogout={logout}
      />
      
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 p-6 overflow-auto">
          <header className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-cyan-900 dark:from-white dark:via-blue-100 dark:to-cyan-100 bg-clip-text text-transparent">{t(`sidebar.${activeTab}`)}</h1>
            </div>
        {/*     <p className="text-gray-600 dark:text-gray-400 text-sm">Pulse POS & Inventory Management</p> */}
          </header>

          <div className="h-[calc(100%-5rem)]">
            <ErrorBoundary>
              {activeTab === 'pos' && <POSScreen onNavigate={setActiveTab} />}
            </ErrorBoundary>
            {activeTab === 'inventory' && (
              <div className="glass-panel p-6 rounded-2xl h-full overflow-hidden">
                <InventoryGrid />
              </div>
            )}
            {activeTab === 'analytics' && (
              <div className="h-full overflow-auto pb-6">
                <AnalyticsScreen />
              </div>
            )}
            {activeTab === 'dashboard' && (
              <div className="h-full overflow-auto pb-6">
                <DashboardScreen />
              </div>
            )}
            {activeTab === 'promotions' && <PromotionsScreen />}
            {activeTab === 'suppliers' && <SupplierManagementScreen />}
            {activeTab === 'purchase-orders' && <PurchaseOrderScreen />}
            {activeTab === 'layaway' && <LayawayScreen />}
            {activeTab === 'locations' && <LocationManagementScreen />}
            {activeTab === 'transfers' && <StockTransferScreen />}
            {activeTab === 'multi-location-dashboard' && <MultiLocationDashboard />}
            {activeTab === 'location-pl' && <LocationProfitLossReport />}
            {activeTab === 'settings' && <SettingsScreen />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
