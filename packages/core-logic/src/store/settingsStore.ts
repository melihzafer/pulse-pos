import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  FIXED_RATE_EUR_TO_BGN,
  FIXED_RATE,
  MAIN_CURRENCY,
  type CurrencyCode
} from '../utils/currencyConfig';

// Note: FIXED_RATE_EUR_TO_BGN and FIXED_RATE are exported from utils/currency.ts
// Do not re-export here to avoid duplicate exports

interface NotificationsConfig {
  lowStock: boolean;
  lowStockThreshold: number;
  highValueSale: boolean;
  highValueThreshold: number;
  failedSync: boolean;
  soundEnabled: boolean;
}

interface SettingsState {
  // Workspace
  workspaceId: string;
  workspaceName: string;

  // Receipt
  receiptHeader: string;
  taxRate: number; // Percentage, e.g. 20 for 20%
  currency: CurrencyCode;

  // Dual Currency
  enableDualCurrencyDisplay: boolean;

  // UI
  theme: 'dark' | 'light';
  language: string;

  // Sync
  autoSync: boolean;
  syncInterval: number; // Seconds

  // Shifts
  enableShifts: boolean;
  blindClose: boolean;
  requirePayReason: boolean;

  // Notifications
  notifications: NotificationsConfig;

  // Actions
  updateSettings: (settings: Partial<Omit<SettingsState, 'updateSettings' | 'resetSettings'>>) => void;
  resetSettings: () => void;
}

const DEFAULT_NOTIFICATIONS: NotificationsConfig = {
  lowStock: true,
  lowStockThreshold: 5,
  highValueSale: true,
  highValueThreshold: 500, // EUR threshold (approx 1000 BGN)
  failedSync: true,
  soundEnabled: true,
};

const DEFAULT_SETTINGS: Omit<SettingsState, 'updateSettings' | 'resetSettings'> = {
  workspaceId: '00000000-0000-0000-0000-000000000000', // Default placeholder
  workspaceName: 'My Store',
  receiptHeader: 'PULSE POS',
  taxRate: 20,
  currency: MAIN_CURRENCY, // Uses 'EUR' from config
  enableDualCurrencyDisplay: true,
  theme: 'light',
  language: 'en',
  autoSync: true,
  syncInterval: 300,
  enableShifts: true,
  blindClose: false,
  requirePayReason: true,
  notifications: DEFAULT_NOTIFICATIONS,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      updateSettings: (newSettings) =>
        set((state) => ({
          ...state,
          ...newSettings,
          // Deep merge notifications if provided partial
          notifications: newSettings.notifications
            ? { ...state.notifications, ...newSettings.notifications }
            : state.notifications,
        })),

      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'pulse-settings-storage', // unique name
    }
  )
);
