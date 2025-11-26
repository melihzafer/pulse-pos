import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Cashier, db } from '../database';

interface AuthState {
  currentCashier: Cashier | null;
  isAuthenticated: boolean;
  login: (username: string, pinCode: string) => Promise<boolean>;
  logout: () => void;
  getCurrentCashier: () => Cashier | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentCashier: null,
      isAuthenticated: false,

      login: async (username: string, pinCode: string) => {
        try {
          console.log('🔐 Attempting login:', { username, pinLength: pinCode.length });
          
          // First check if database is accessible
          try {
            const dbExists = await db.open();
            console.log('✅ Database opened successfully:', dbExists.name);
          } catch (dbError) {
            console.error('❌ Database open failed:', dbError);
            return false;
          }
          
          // Get all cashiers and filter manually for more reliable matching
          const allCashiers = await db.cashiers.toArray();
          console.log('👥 Total cashiers in DB:', allCashiers.length);
          console.log('📋 Cashiers:', allCashiers.map(c => ({ 
            username: c.username, 
            pin: c.pin_code, 
            active: c.is_active, 
            deleted: c._deleted 
          })));
          
          const cashier = allCashiers.find(c => 
            c.username.toLowerCase() === username.toLowerCase() &&
            c.pin_code === pinCode &&
            c.is_active &&
            !c._deleted
          );

          console.log('✅ Cashier found:', cashier ? cashier.username : 'None');

          if (cashier) {
            set({ currentCashier: cashier, isAuthenticated: true });
            return true;
          }
          return false;
        } catch (error) {
          console.error('❌ Login error:', error);
          return false;
        }
      },

      logout: () => {
        set({ currentCashier: null, isAuthenticated: false });
      },

      getCurrentCashier: () => {
        return get().currentCashier;
      },
    }),
    {
      name: 'pulse-auth',
      partialize: (state) => ({
        currentCashier: state.currentCashier,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
