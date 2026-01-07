import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F1', action: t('shortcuts.help', 'Show this help menu') },
    { key: 'F5', action: t('shortcuts.pay', 'Process Payment / Checkout') },
    { key: 'F6', action: t('shortcuts.park', 'Park Current Order') },
    { key: 'F7', action: t('shortcuts.retrieve', 'Retrieve Held Order') },
    { key: 'Esc', action: t('shortcuts.clear', 'Clear Cart / Close Modal') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        <div className="p-6 pb-0 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Keyboard className="text-blue-500" />
                {t('common.shortcuts', 'Keyboard Shortcuts')}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {shortcuts.map(({ key, action }) => (
              <div key={key} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                <span className="text-gray-700 dark:text-slate-300 font-medium">{action}</span>
                <kbd className="px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-slate-600 font-mono font-bold shadow-sm text-sm min-w-[2.5rem] text-center">
                  {key}
                </kbd>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-700 text-center">
             <p className="text-sm text-gray-500 dark:text-slate-500">
                 {t('shortcuts.hint', 'Pro tip: Use a barcode scanner for fastest entry.')}
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
