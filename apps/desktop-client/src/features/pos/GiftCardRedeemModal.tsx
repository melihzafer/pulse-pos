import React, { useState, useRef, useEffect } from 'react';
import { X, Gift, Search, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GiftCardService } from '@pulse/core-logic';
import { toast } from 'sonner';
import clsx from 'clsx';

interface GiftCardRedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxAmount: number; // Maximum amount that can be redeemed (transaction total)
  onRedeem: (cardNumber: string, amount: number) => void;
}

export const GiftCardRedeemModal: React.FC<GiftCardRedeemModalProps> = ({
  isOpen,
  onClose,
  maxAmount,
  onRedeem,
}) => {
  const { t } = useTranslation();
  const [cardNumber, setCardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [checking, setChecking] = useState(false);
  const [cardBalance, setCardBalance] = useState<number | null>(null);
  const [cardFound, setCardFound] = useState(false);
  const [cardActive, setCardActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCardNumber('');
      setAmount('');
      setCardBalance(null);
      setCardFound(false);
      setCardActive(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckBalance = async () => {
    if (!cardNumber.trim()) {
      toast.error(t('giftCard.enterCardNumber', 'Please enter a gift card number'));
      return;
    }

    setChecking(true);
    try {
      const result = await GiftCardService.checkBalance(cardNumber.trim());
      
      if (!result.found) {
        toast.error(t('giftCard.notFound', 'Gift card not found'));
        setCardFound(false);
        setCardBalance(null);
        return;
      }

      setCardFound(true);
      setCardBalance(result.balance);
      setCardActive(result.isActive);

      if (!result.isActive) {
        toast.warning(t('giftCard.inactive', 'This gift card is inactive'));
      } else if (result.balance <= 0) {
        toast.warning(t('giftCard.noBalance', 'This gift card has no balance'));
      } else {
        // Auto-fill amount with minimum of balance and max transaction amount
        const suggestedAmount = Math.min(result.balance, maxAmount);
        setAmount(suggestedAmount.toFixed(2));
        toast.success(
          t('giftCard.balanceChecked', {
            defaultValue: 'Balance: {{balance}} BGN',
            balance: result.balance.toFixed(2),
          })
        );
      }
    } catch (error) {
      console.error('Failed to check gift card balance:', error);
      toast.error(t('giftCard.checkError', 'Failed to check gift card balance'));
    } finally {
      setChecking(false);
    }
  };

  const handleRedeem = () => {
    const redeemAmount = parseFloat(amount);

    if (!cardFound || !cardActive) {
      toast.error(t('giftCard.invalidCard', 'Invalid or inactive gift card'));
      return;
    }

    if (isNaN(redeemAmount) || redeemAmount <= 0) {
      toast.error(t('giftCard.invalidAmount', 'Please enter a valid amount'));
      return;
    }

    if (cardBalance !== null && redeemAmount > cardBalance) {
      toast.error(
        t('giftCard.insufficientBalance', {
          defaultValue: 'Insufficient balance. Available: {{balance}} BGN',
          balance: cardBalance.toFixed(2),
        })
      );
      return;
    }

    if (redeemAmount > maxAmount) {
      toast.error(
        t('giftCard.exceedsTotal', {
          defaultValue: 'Amount exceeds transaction total ({{max}} BGN)',
          max: maxAmount.toFixed(2),
        })
      );
      return;
    }

    onRedeem(cardNumber.trim(), redeemAmount);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!cardFound) {
        handleCheckBalance();
      } else if (amount) {
        handleRedeem();
      }
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
              {t('giftCard.redeemTitle', 'Redeem Gift Card')}
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
          {/* Card Number Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              {t('giftCard.cardNumber', 'Gift Card Number')}
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="GC1234567890"
                className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none dark:text-white font-mono"
                disabled={checking}
              />
              <button
                onClick={handleCheckBalance}
                disabled={checking || !cardNumber.trim()}
                className={clsx(
                  "px-4 py-3 rounded-xl font-medium transition-colors flex items-center gap-2",
                  checking || !cardNumber.trim()
                    ? "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                )}
              >
                <Search size={18} />
                {checking ? t('common.checking', 'Checking...') : t('common.check', 'Check')}
              </button>
            </div>
          </div>

          {/* Balance Display */}
          {cardFound && cardBalance !== null && (
            <div
              className={clsx(
                "p-4 rounded-xl border-2",
                cardActive && cardBalance > 0
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {cardActive && cardBalance > 0 ? (
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Gift size={16} />
                    <span className="font-semibold text-sm">
                      {t('giftCard.available', 'Available Balance')}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle size={16} />
                    <span className="font-semibold text-sm">
                      {!cardActive
                        ? t('giftCard.inactive', 'Inactive Card')
                        : t('giftCard.noBalance', 'No Balance')}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
                {cardBalance.toFixed(2)} BGN
              </p>
            </div>
          )}

          {/* Amount Input */}
          {cardFound && cardActive && cardBalance !== null && cardBalance > 0 && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('giftCard.amountToRedeem', 'Amount to Redeem')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="0.00"
                  step="0.01"
                  max={Math.min(cardBalance, maxAmount)}
                  className="w-full px-4 py-3 pr-12 text-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none dark:text-white font-mono"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 font-medium">
                  BGN
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {t('giftCard.maxRedeemable', {
                  defaultValue: 'Max: {{max}} BGN',
                  max: Math.min(cardBalance, maxAmount).toFixed(2),
                })}
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <AlertCircle size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {t('giftCard.scanHint', 'Scan or enter the gift card number, then specify the amount to apply to this transaction.')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border-2 border-gray-300 dark:border-slate-600 rounded-xl font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleRedeem}
            disabled={
              !cardFound || !cardActive || cardBalance === null || cardBalance <= 0 || !amount || parseFloat(amount) <= 0
            }
            className={clsx(
              "flex-1 py-3 px-4 rounded-xl font-semibold transition-colors",
              !cardFound || !cardActive || cardBalance === null || cardBalance <= 0 || !amount || parseFloat(amount) <= 0
                ? "bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
            )}
          >
            {t('giftCard.redeem', 'Redeem')}
          </button>
        </div>
      </div>
    </div>
  );
};
