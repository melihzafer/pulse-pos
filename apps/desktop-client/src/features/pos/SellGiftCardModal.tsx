import React, { useState, useEffect, useRef } from 'react';
import { X, Gift, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GiftCardService, useAuthStore } from '@pulse/core-logic';
import { toast } from 'sonner';
import clsx from 'clsx';

const WORKSPACE_ID = '00000000-0000-0000-0000-000000000000'; // TODO: Get from context when multi-workspace support is added

interface SellGiftCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSold: (amount: number, cardNumber: string) => void;
}

export const SellGiftCardModal: React.FC<SellGiftCardModalProps> = ({
  isOpen,
  onClose,
  onSold,
}) => {
  const { t } = useTranslation();
  const { currentCashier } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [issuing, setIssuing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Preset amounts
  const presetAmounts = [50, 100, 200, 500];

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setNotes('');
      setIssuing(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleIssue = async () => {
    const giftAmount = parseFloat(amount);

    if (isNaN(giftAmount) || giftAmount <= 0) {
      toast.error(t('giftCard.invalidAmount', 'Please enter a valid amount'));
      return;
    }

    if (!currentCashier?.id) {
      toast.error(t('giftCard.noCashier', 'No cashier logged in'));
      return;
    }

    setIssuing(true);
    try {
      const giftCard = await GiftCardService.issueGiftCard(WORKSPACE_ID, {
        amount: giftAmount,
        issuedByUserId: currentCashier.id,
        notes: notes.trim() || undefined,
      });

      toast.success(
        t('giftCard.issued', {
          defaultValue: 'Gift card issued: {{cardNumber}}',
          cardNumber: giftCard.card_number,
        })
      );

      // Call parent callback to add to cart
      onSold(giftAmount, giftCard.card_number);
      onClose();
    } catch (error) {
      console.error('Failed to issue gift card:', error);
      toast.error(t('giftCard.issueError', 'Failed to issue gift card'));
    } finally {
      setIssuing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && amount) {
      handleIssue();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <div className="flex items-center gap-2">
            <Gift className="text-purple-600 dark:text-purple-400" size={24} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('giftCard.sellTitle', 'Sell Gift Card')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('giftCard.amount', 'Gift Card Amount')}
            </label>
            <div className="relative">
              <DollarSign
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                ref={inputRef}
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0.00"
                step="0.01"
                min="1"
                className="w-full pl-10 pr-12 py-3 text-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none dark:text-white font-mono"
                disabled={issuing}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 font-medium">
                BGN
              </span>
            </div>
          </div>

          {/* Preset Amounts */}
          <div className="grid grid-cols-4 gap-2">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(preset.toString())}
                className={clsx(
                  "py-2 px-3 rounded-lg font-semibold transition-colors border-2",
                  amount === preset.toString()
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                    : "border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 text-gray-700 dark:text-slate-300"
                )}
                disabled={issuing}
              >
                {preset} BGN
              </button>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('giftCard.notes', 'Notes (Optional)')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('giftCard.notesPlaceholder', 'E.g., Birthday gift, Corporate order')}
              rows={2}
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none dark:text-white resize-none"
              disabled={issuing}
            />
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Gift size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {t('giftCard.sellHint', 'A unique gift card number will be generated. The card can be printed on the receipt and used for future purchases.')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex gap-3">
          <button
            onClick={onClose}
            disabled={issuing}
            className="flex-1 py-3 px-4 border-2 border-gray-300 dark:border-slate-600 rounded-xl font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleIssue}
            disabled={!amount || parseFloat(amount) <= 0 || issuing}
            className={clsx(
              "flex-1 py-3 px-4 rounded-xl font-semibold transition-colors",
              !amount || parseFloat(amount) <= 0 || issuing
                ? "bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
            )}
          >
            {issuing
              ? t('giftCard.issuing', 'Issuing...')
              : t('giftCard.issue', 'Issue Gift Card')}
          </button>
        </div>
      </div>
    </div>
  );
};
