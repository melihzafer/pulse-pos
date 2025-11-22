import { useState, useEffect } from 'react';
import { Sidebar } from './layouts/Sidebar';
import { POSScreen } from './features/pos/POSScreen';
import { InventoryGrid } from './features/inventory/InventoryGrid';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { DashboardScreen } from './features/dashboard/DashboardScreen';
import { PromotionsScreen } from './features/promotions/PromotionsScreen';
import { Toaster } from 'sonner';
import { CustomerDisplayScreen } from './features/customer-display/CustomerDisplayScreen';

function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const isCustomerDisplay = new URLSearchParams(window.location.search).get('mode') === 'customer-display';

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
      {/* @ts-expect-error - Toaster type mismatch */}
      <Toaster position="top-center" richColors />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} theme={theme} onThemeToggle={toggleTheme} />
      
      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 p-6 overflow-auto">
          <header className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-cyan-900 dark:from-white dark:via-blue-100 dark:to-cyan-100 bg-clip-text text-transparent capitalize">{activeTab}</h1>
            </div>
        {/*     <p className="text-gray-600 dark:text-gray-400 text-sm">Pulse POS & Inventory Management</p> */}
          </header>

          <div className="h-[calc(100%-5rem)]">
            {activeTab === 'pos' && <POSScreen onNavigate={setActiveTab} />}
            {activeTab === 'inventory' && (
              <div className="glass-panel p-6 rounded-2xl h-full overflow-hidden">
                <InventoryGrid />
              </div>
            )}
            {activeTab === 'dashboard' && (
              <div className="h-full overflow-auto pb-6">
                <DashboardScreen />
              </div>
            )}
            {activeTab === 'promotions' && <PromotionsScreen />}
            {activeTab === 'settings' && <SettingsScreen />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
