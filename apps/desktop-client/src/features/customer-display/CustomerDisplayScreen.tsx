import React, { useEffect, useState } from 'react';
import { CartItem, formatCurrency } from '@pulse/core-logic';
import { ShoppingCart, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type DisplayState = {
  items: CartItem[];
  total: number;
  lastChange: number | null;
  status: 'idle' | 'active' | 'success';
};

export const CustomerDisplayScreen: React.FC = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<DisplayState>({
    items: [],
    total: 0,
    lastChange: null,
    status: 'idle',
  });

  useEffect(() => {
    const channel = new BroadcastChannel('customer-display');

    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      
      if (type === 'CART_UPDATE') {
        setState(prev => ({
          ...prev,
          items: payload.items,
          total: payload.total,
          status: payload.items.length > 0 ? 'active' : 'idle',
          lastChange: null,
        }));
      } else if (type === 'PAYMENT_COMPLETE') {
        setState(prev => ({
          ...prev,
          lastChange: payload.change,
          status: 'success',
        }));
        
        // Reset to idle after a delay
        setTimeout(() => {
          setState(prev => ({ ...prev, status: 'idle', items: [], total: 0, lastChange: null }));
        }, 10000);
      } else if (type === 'CLEAR_CART') {
        setState({
          items: [],
          total: 0,
          lastChange: null,
          status: 'idle',
        });
      }
    };

    return () => channel.close();
  }, []);

  if (state.status === 'idle') {
    return (
      <div className="h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 text-center">
        <Store size={120} className="text-blue-500 mb-8 animate-pulse" />
        <h1 className="text-5xl font-bold mb-4">{t('customerDisplay.welcome')}</h1>
        <p className="text-2xl text-slate-400">{t('customerDisplay.nextCustomer')}</p>
      </div>
    );
  }

  if (state.status === 'success') {
    return (
      <div className="h-screen bg-green-600 text-white flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-white/20 p-8 rounded-full mb-8">
          <ShoppingCart size={80} className="text-white" />
        </div>
        <h1 className="text-6xl font-bold mb-8">{t('customerDisplay.thankYou')}</h1>
        <div className="bg-black/20 p-8 rounded-2xl min-w-[400px]">
          <p className="text-2xl mb-2 opacity-80">{t('customerDisplay.changeDue')}</p>
          <p className="text-7xl font-mono font-bold">{formatCurrency(state.lastChange || 0)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white p-6 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-lg">
            <ShoppingCart className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">{t('customerDisplay.yourCart')}</h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">{t('customerDisplay.totalToPay')}</p>
          <p className="text-5xl font-bold text-blue-600 font-mono">{formatCurrency(state.total)}</p>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {state.items.map((item) => (
          <div key={item.product.id} className="bg-white p-6 rounded-xl shadow-sm flex justify-between items-center animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                <Store size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {item.product.name}
                  {item.isPayItForward && <span className="ml-2 text-sm bg-pink-100 text-pink-600 px-2 py-1 rounded-full">Pay It Forward</span>}
                  {item.redeemedFromPifId && <span className="ml-2 text-sm bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Redeemed</span>}
                </h3>
                <p className="text-xl text-gray-500">
                  {item.quantity} x {formatCurrency(item.priceOverride !== undefined ? item.priceOverride : item.product.sale_price)}
                </p>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 font-mono">
              {formatCurrency(item.subtotal)}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 p-6">
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <p className="text-xl text-gray-500">{t('customerDisplay.subtotal')}: {formatCurrency(state.total / 1.1)}</p>
            <p className="text-xl text-gray-500">{t('customerDisplay.tax')}: {formatCurrency(state.total - (state.total / 1.1))}</p>
          </div>
          <div className="text-right">
            <p className="text-6xl font-bold text-gray-900 font-mono">{formatCurrency(state.total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
