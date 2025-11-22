import React, { useState } from 'react';
import { Check, Printer, Mail, QrCode, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, CartItem } from '@pulse/core-logic';
import clsx from 'clsx';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  change: number;
  total: number;
  items?: CartItem[];
  onPrint: () => void;
  onEmail: (email: string) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, change, total, items, onPrint, onEmail }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showQR, setShowQR] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 text-green-600 dark:text-green-400">
            <Check size={48} strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('receipt.paymentSuccessful')}</h2>
          <p className="text-gray-500 dark:text-slate-400 mb-6">{t('receipt.thankYou')}</p>

          <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 w-full mb-6">
            {items && items.length > 0 && (
              <div className="mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-slate-400">
                      {item.quantity}x {item.product.name}
                    </span>
                    <div className="text-right">
                      <span className="text-gray-900 dark:text-white">{formatCurrency(item.subtotal)}</span>
                      {item.discount && item.discount > 0 && (
                        <div className="text-xs text-green-600 dark:text-green-400">
                          Promo: -{formatCurrency(item.discount)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600 dark:text-slate-400">{t('payment.totalAmount')}</span>
              <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(total)}</span>
            </div>
            {change > 0 && (
              <div className="flex justify-between items-center text-lg">
                <span className="text-gray-600 dark:text-slate-400">{t('payment.change')}</span>
                <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(change)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 w-full mb-6">
            <button 
              onClick={onPrint}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Printer size={24} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium">{t('receipt.print')}</span>
            </button>
            <button 
              onClick={() => setShowEmailInput(!showEmailInput)}
              className={clsx(
                "flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors",
                showEmailInput 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                  : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              )}
            >
              <Mail size={24} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium">{t('receipt.email')}</span>
            </button>
            <button 
              onClick={() => setShowQR(!showQR)}
              className={clsx(
                "flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors",
                showQR 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                  : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              )}
            >
              <QrCode size={24} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium">{t('receipt.qr')}</span>
            </button>
          </div>

          {showEmailInput && (
            <div className="w-full mb-6 animate-in slide-in-from-top-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={() => onEmail(email)}
                  className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700"
                >
                  {t('common.send')}
                </button>
              </div>
            </div>
          )}

          {showQR && (
            <div className="w-full mb-6 flex justify-center animate-in slide-in-from-top-2">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                {/* Placeholder for QR Code */}
                <div className="w-32 h-32 bg-gray-900 flex items-center justify-center text-white text-xs">
                  QR Code
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <span>{t('receipt.newSale')}</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
