import React from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'confirm';
  confirmText?: string;
  cancelText?: string;
}

export const Alert: React.FC<AlertProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText,
  cancelText,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-12 h-12 text-red-500" />;
      case 'confirm':
        return <AlertCircle className="w-12 h-12 text-blue-500" />;
      default:
        return <Info className="w-12 h-12 text-blue-500" />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'success':
        return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
      case 'warning':
        return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
      case 'error':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
      case 'confirm':
        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border-2 border-gray-200 dark:border-slate-700 animate-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className={`flex items-start gap-4 p-4 rounded-xl border-2 ${getColorClasses()}`}>
            <div className="flex-shrink-0 mt-1">
              {getIcon()}
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed flex-1">
              {message}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-slate-700">
          {type === 'confirm' || onConfirm ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {cancelText || t('common.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 px-4 py-3 text-white rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  type === 'error'
                    ? 'bg-red-500 hover:bg-red-600'
                    : type === 'warning'
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {confirmText || t('common.confirm')}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-white bg-blue-500 hover:bg-blue-600 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              {confirmText || t('common.ok')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
