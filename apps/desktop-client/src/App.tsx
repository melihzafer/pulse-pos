import { useState, useEffect } from 'react';
import { Sidebar } from './layouts/Sidebar';
import { POSScreen } from './features/pos/POSScreen';
import { InventoryGrid } from './features/inventory/InventoryGrid';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { QuickActionsDashboard } from './features/dashboard/QuickActionsDashboard';
import { PromotionsScreen } from './features/promotions/PromotionsScreen';
import { AnalyticsScreen } from './features/analytics/AnalyticsScreen';
import { SupplierManagementScreen } from './features/suppliers';
import { PurchaseOrderScreen } from './features/purchase-orders';
import { LayawayScreen } from './features/layaway/LayawayScreen';
import { LocationManagementScreen } from './features/locations/LocationManagementScreen';
import { StockTransferScreen } from './features/locations/StockTransferScreen';
import { MultiLocationDashboard } from './features/locations/MultiLocationDashboard';
import { LocationProfitLossReport } from './features/locations/LocationProfitLossReport';
import { UserManagementScreen } from './features/employees/UserManagementScreen';
import { RoleManagementScreen } from './features/employees/RoleManagementScreen';
import { TimeClockScreen } from './features/employees/TimeClockScreen';
import { ActivityLogViewer } from './features/employees/ActivityLogViewer';
import { LoginScreen } from './features/auth/LoginScreen';
import { ReceiptDesignerScreen, ZReportScreen, LabelPrintingScreen } from './features/receipts';
import { Toaster } from 'sonner';
import { CustomerDisplayScreen } from './features/customer-display/CustomerDisplayScreen';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuthStore, createDatabase, MyDatabase } from '@pulse/core-logic';
import { sendNotification } from './utils/notifications';
import { seedDatabase } from './utils/seedData';
import { Provider } from 'rxdb-hooks';

function App() {
  const { t } = useTranslation();
  const { isAuthenticated, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('home');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [db, setDb] = useState<MyDatabase | null>(null);
  const isCustomerDisplay = new URLSearchParams(window.location.search).get('mode') === 'customer-display';

  // Initialize DB
  useEffect(() => {
    createDatabase().then(setDb);
  }, []);

  // IMPORTANT: All hooks must be called before any conditional returns
  // Auto-seed database with sample products if empty
  // Auto-seed database with sample products if empty
  useEffect(() => {
    const checkAndSeedDatabase = async () => {
      if (!db) return;
      try {
        const productCount = await db.products.count().exec();
        const customerCount = await db.customers.count().exec();
        
        console.log(`📊 Mevcut durum: ${productCount} ürün, ${customerCount} müşteri`);
        
        // Re-seed if: no products or no customers
        if (productCount === 0 || customerCount === 0) {
          console.log('🔄 Veritabanı yeniden yükleniyor (schema güncellemesi)...');
          await seedDatabase(db);
          console.log('✅ Örnek veriler başarıyla yüklendi!');
          
          // Show success notification
          sendNotification({
            title: 'Database Refreshed',
            message: 'Sample products and customers reloaded with latest schema!',
            type: 'success',
            category: 'general'
          });
        } else {
          console.log(`✓ Veritabanı hazır (yeni schema): ${productCount} ürün, ${customerCount} müşteri`);
        }
      } catch (error) {
        console.error('❌ Veritabanı seed hatası:', error);
      }
    };

    if (isAuthenticated && db) {
      checkAndSeedDatabase();
    }
  }, [isAuthenticated, db]);

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

  if (!db) return <div className="flex items-center justify-center h-screen">Initializing Database...</div>;

  if (isCustomerDisplay) {
    return (
      <Provider db={db}>
        <div className={theme === 'dark' ? 'dark' : ''}>
          <CustomerDisplayScreen />
        </div>
      </Provider>
    );
  }

  return (
    <Provider db={db}>
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
              {activeTab === 'home' && (
                <ErrorBoundary>
                  <QuickActionsDashboard onNavigate={setActiveTab} />
                </ErrorBoundary>
              )}
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
              {activeTab === 'promotions' && <PromotionsScreen />}
              {activeTab === 'suppliers' && <SupplierManagementScreen />}
              {activeTab === 'purchase-orders' && <PurchaseOrderScreen />}
              {activeTab === 'layaway' && <LayawayScreen />}
              {activeTab === 'locations' && <LocationManagementScreen />}
              {activeTab === 'transfers' && <StockTransferScreen />}
              {activeTab === 'multi-location-dashboard' && <MultiLocationDashboard />}
              {activeTab === 'location-pl' && <LocationProfitLossReport />}
              {activeTab === 'time-clock' && <TimeClockScreen />}
              {activeTab === 'users' && <UserManagementScreen />}
              {activeTab === 'roles' && <RoleManagementScreen />}
              {activeTab === 'activity-log' && <ActivityLogViewer />}
              {activeTab === 'receipt-designer' && <ReceiptDesignerScreen />}
              {activeTab === 'z-report' && <ZReportScreen />}
              {activeTab === 'label-printing' && <LabelPrintingScreen />}
              {activeTab === 'settings' && <SettingsScreen />}
            </div>
          </div>
        </main>
      </div>
    </Provider>
  );
}

export default App;
