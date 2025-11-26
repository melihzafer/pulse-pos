import React, { useState, useEffect } from 'react';
import { Printer, Wifi, Database, Globe, FileText, Clock, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CashierManagement } from './CashierManagement';

interface Settings {
  printerIP: string;
  printerPort: string;
  workspaceId: string;
  workspaceName: string;
  receiptHeader: string;
  taxRate: number;
  autoSync: boolean;
  syncInterval: number;
  theme: 'dark' | 'light';
  language: string;
  enableShifts: boolean;
  blindClose: boolean;
  requirePayReason: boolean;
  notifications: {
    lowStock: boolean;
    lowStockThreshold: number;
    highValueSale: boolean;
    highValueThreshold: number;
    failedSync: boolean;
    soundEnabled: boolean;
  };
}

const DEFAULT_SETTINGS: Settings = {
  printerIP: '192.168.1.100',
  printerPort: '9100',
  workspaceId: '',
  workspaceName: 'My Store',
  receiptHeader: 'PULSE POS',
  taxRate: 20,
  autoSync: true,
  syncInterval: 300, // 5 minutes
  theme: 'light',
  language: 'en',
  enableShifts: true,
  blindClose: false,
  requirePayReason: true,
  notifications: {
    lowStock: true,
    lowStockThreshold: 5,
    highValueSale: true,
    highValueThreshold: 1000,
    failedSync: true,
    soundEnabled: true,
  },
};

interface SettingsScreenProps {
  onThemeChange?: (theme: 'light' | 'dark') => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onThemeChange }) => {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('pulse-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        // Apply language if saved
        if (parsed.language && parsed.language !== i18n.language) {
          i18n.changeLanguage(parsed.language);
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, [i18n]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('pulse-settings', JSON.stringify(settings));
      
      // Dispatch custom event for other components to update
      window.dispatchEvent(new CustomEvent('pulse-settings-changed', { detail: settings }));

      if (onThemeChange) {
        onThemeChange(settings.theme);
      }
      if (settings.language !== i18n.language) {
        i18n.changeLanguage(settings.language);
      }
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Failed to save settings:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrinter = () => {
    // This will use Electron IPC to test the printer
    if (window.electronAPI?.printReceipt) {
      window.electronAPI.printReceipt({
        items: [{ name: 'Test Print', quantity: 1, price: 0 }],
        total: 0,
        paymentMethod: 'cash',
      });
    } else {
      alert('Printer API not available. This feature requires Electron.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cashier Management */}
      <section className="glass-panel p-6 rounded-2xl">
        <CashierManagement />
      </section>

      {/* Language Settings */}
      <section className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="text-blue-600 dark:text-blue-400" size={24} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.language.title')}</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-400 mb-2">{t('settings.language.select')}</label>
            <select
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="en">English</option>
              <option value="tr">Türkçe</option>
              <option value="bg">Български</option>
            </select>
          </div>
        </div>
      </section>

      {/* Printer Settings */}
      <section className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Printer className="text-blue-600 dark:text-blue-400" size={24} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.printer.title')}</h2>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-slate-400 mb-2">{t('settings.printer.ip')}</label>
              <input
                type="text"
                value={settings.printerIP}
                onChange={(e) => setSettings({ ...settings, printerIP: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                placeholder="192.168.1.100"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-slate-400 mb-2">{t('settings.printer.port')}</label>
              <input
                type="text"
                value={settings.printerPort}
                onChange={(e) => setSettings({ ...settings, printerPort: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                placeholder="9100"
              />
            </div>
          </div>
          
          <button
            onClick={handleTestPrinter}
            className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-lg transition-colors"
          >
            {t('settings.printer.test')}
          </button>
        </div>
      </section>

      {/* Receipt Settings */}
      <section className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="text-blue-600 dark:text-blue-400" size={24} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.receipt.title')}</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-400 mb-2">{t('settings.receipt.header')}</label>
            <input
              type="text"
              value={settings.receiptHeader}
              onChange={(e) => setSettings({ ...settings, receiptHeader: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              placeholder="PULSE POS"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-400 mb-2">{t('settings.receipt.taxRate')} (%)</label>
            <input
              type="number"
              value={settings.taxRate}
              onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) })}
              className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              placeholder="20"
            />
          </div>
        </div>
      </section>

      {/* Workspace Settings */}
      <section className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Database className="text-blue-600 dark:text-blue-400" size={24} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.workspace.title')}</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-400 mb-2">{t('settings.workspace.name')}</label>
            <input
              type="text"
              value={settings.workspaceName}
              onChange={(e) => setSettings({ ...settings, workspaceName: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              placeholder="My Store"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-400 mb-2">{t('settings.workspace.id')}</label>
            <input
              type="text"
              value={settings.workspaceId}
              onChange={(e) => setSettings({ ...settings, workspaceId: e.target.value })}
              className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-mono text-sm"
              placeholder="uuid-here"
            />
          </div>
        </div>
      </section>

      {/* Sync Settings */}
      <section className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Wifi className="text-blue-600 dark:text-blue-400" size={24} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.sync.title')}</h2>
        </div>
        
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoSync}
              onChange={(e) => setSettings({ ...settings, autoSync: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-900 dark:text-white">{t('settings.sync.enable')}</span>
          </label>
          
          {settings.autoSync && (
            <div>
              <label className="block text-sm text-gray-600 dark:text-slate-400 mb-2">{t('settings.sync.interval')}</label>
              <input
                type="number"
                value={settings.syncInterval}
                onChange={(e) => setSettings({ ...settings, syncInterval: parseInt(e.target.value) || 300 })}
                className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                min="30"
                max="3600"
              />
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                {t('settings.sync.recommended')}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Shift Settings */}
      <section className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="text-blue-600 dark:text-blue-400" size={24} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.shifts.title')}</h2>
        </div>
        
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableShifts}
              onChange={(e) => setSettings({ ...settings, enableShifts: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-900 dark:text-white">{t('settings.shifts.enable')}</span>
          </label>

          {settings.enableShifts && (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.blindClose}
                  onChange={(e) => setSettings({ ...settings, blindClose: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-900 dark:text-white">{t('settings.shifts.blindClose')}</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requirePayReason}
                  onChange={(e) => setSettings({ ...settings, requirePayReason: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-900 dark:text-white">{t('settings.shifts.requireReason')}</span>
              </label>
            </>
          )}
        </div>
      </section>

      {/* Notification Settings */}
      <section className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="text-blue-600 dark:text-blue-400" size={24} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.notifications.title', 'Notifications')}</h2>
        </div>
        
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifications?.soundEnabled ?? true}
              onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, soundEnabled: e.target.checked } })}
              className="w-5 h-5 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-900 dark:text-white">{t('settings.notifications.sound', 'Enable Sound Effects')}</span>
          </label>

          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <label className="flex items-center gap-3 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={settings.notifications?.lowStock ?? true}
                onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, lowStock: e.target.checked } })}
                className="w-5 h-5 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-900 dark:text-white">{t('settings.notifications.lowStock', 'Low Stock Alerts')}</span>
            </label>
            {settings.notifications?.lowStock && (
              <div className="ml-8">
                <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1">{t('settings.notifications.threshold', 'Threshold (units)')}</label>
                <input
                  type="number"
                  value={settings.notifications?.lowStockThreshold ?? 5}
                  onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, lowStockThreshold: parseInt(e.target.value) || 0 } })}
                  className="w-32 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <label className="flex items-center gap-3 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={settings.notifications?.highValueSale ?? true}
                onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, highValueSale: e.target.checked } })}
                className="w-5 h-5 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-900 dark:text-white">{t('settings.notifications.highValue', 'High Value Sale Alerts')}</span>
            </label>
            {settings.notifications?.highValueSale && (
              <div className="ml-8">
                <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1">{t('settings.notifications.amount', 'Amount (BGN)')}</label>
                <input
                  type="number"
                  value={settings.notifications?.highValueThreshold ?? 1000}
                  onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, highValueThreshold: parseInt(e.target.value) || 0 } })}
                  className="w-32 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-1 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications?.failedSync ?? true}
                onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, failedSync: e.target.checked } })}
                className="w-5 h-5 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-900 dark:text-white">{t('settings.notifications.sync', 'Failed Sync Alerts')}</span>
            </label>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            saveStatus === 'success'
              ? 'bg-green-600 text-white shadow-lg'
              : saveStatus === 'error'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-2xl'
          } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isSaving ? t('settings.saveButton.saving') : saveStatus === 'success' ? t('settings.saveButton.saved') : saveStatus === 'error' ? t('settings.saveButton.error') : t('settings.saveButton.default')}
        </button>
      </div>
    </div>
  );
};
