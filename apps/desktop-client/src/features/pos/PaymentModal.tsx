import React, { useState, useEffect, useRef } from 'react';
import { X, CreditCard, Banknote, Check, ArrowRightLeft, PieChart, Trash2, Plus, Gift, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PaymentMethod, useCartStore, db, GiftCardService } from '@pulse/core-logic';
import clsx from 'clsx';
import { GiftCardRedeemModal } from './GiftCardRedeemModal';
import { toast } from 'sonner';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onComplete: (method: PaymentMethod, amountTendered: number, change: number, payments?: { method: PaymentMethod, amount: number }[]) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, total, onComplete }) => {
  const { t } = useTranslation();
  const { customer, items } = useCartStore();
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentCurrency, setPaymentCurrency] = useState<'BGN' | 'EUR'>('BGN');
  const [changeCurrency, setChangeCurrency] = useState<'BGN' | 'EUR'>('BGN');
  
  // Split payment state
  const [splitPayments, setSplitPayments] = useState<{ method: PaymentMethod, amount: number }[]>([]);
  const [splitAmount, setSplitAmount] = useState<string>('');
  const [splitMethod, setSplitMethod] = useState<PaymentMethod>('cash');
  
  // Gift card state
  const [isGiftCardModalOpen, setIsGiftCardModalOpen] = useState(false);
  const [giftCardRedemptions, setGiftCardRedemptions] = useState<{ cardNumber: string; amount: number }[]>([]);
  
  // Store credit state
  const [customerCreditBalance, setCustomerCreditBalance] = useState(0);
  const [storeCreditApplied, setStoreCreditApplied] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const FIXED_RATE = 1.95583;

  useEffect(() => {
    if (isOpen) {
      setMethod('cash');
      setAmountTendered('');
      setIsProcessing(false);
      setPaymentCurrency('BGN');
      setChangeCurrency('BGN');
      setSplitPayments([]);
      setSplitAmount('');
      setSplitMethod('cash');
      setGiftCardRedemptions([]);
      setIsGiftCardModalOpen(false);
      setStoreCreditApplied(0);
      
      // Load customer credit balance
      if (customer?.id) {
        db.customers.get(customer.id).then((c) => {
          const creditBalance = c?.credit_balance || 0;
          setCustomerCreditBalance(creditBalance);
        });
      } else {
        setCustomerCreditBalance(0);
      }
      
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, customer]);

  if (!isOpen) return null;

  // Calculate totals based on payment currency
  const totalDisplay = paymentCurrency === 'BGN' ? total : total / FIXED_RATE;
  
  // Calculate gift card redemption total
  const giftCardTotal = giftCardRedemptions.reduce((sum, gc) => sum + gc.amount, 0);
  
  // Split payment calculations (subtract gift cards and store credit from total)
  const adjustedTotal = totalDisplay - giftCardTotal - storeCreditApplied;
  
  // Calculate change
  const amount = parseFloat(amountTendered || '0');
  const changeInPaymentCurrency = method === 'cash' ? Math.max(0, amount - adjustedTotal) : 0;
  
  // Convert change to display currency
  let changeDisplay = 0;
  if (paymentCurrency === changeCurrency) {
    changeDisplay = changeInPaymentCurrency;
  } else if (paymentCurrency === 'BGN' && changeCurrency === 'EUR') {
    changeDisplay = changeInPaymentCurrency / FIXED_RATE;
  } else if (paymentCurrency === 'EUR' && changeCurrency === 'BGN') {
    changeDisplay = changeInPaymentCurrency * FIXED_RATE;
  }

  const remainingAmount = adjustedTotal - splitPayments.reduce((sum, p) => sum + p.amount, 0);
  const canAddSplit = parseFloat(splitAmount) > 0 && parseFloat(splitAmount) <= remainingAmount + 0.01;

  const canComplete = giftCardTotal >= totalDisplay || (method === 'split' 
    ? Math.abs(remainingAmount) < 0.01 
    : (method === 'card' || (amount >= adjustedTotal)));

  const handleAddSplit = () => {
    if (!canAddSplit) return;
    const amount = parseFloat(splitAmount);
    setSplitPayments([...splitPayments, { method: splitMethod, amount }]);
    setSplitAmount('');
  };

  const handleRemoveSplit = (index: number) => {
    const newPayments = [...splitPayments];
    newPayments.splice(index, 1);
    setSplitPayments(newPayments);
  };

  const handleGiftCardRedeem = async (cardNumber: string, amount: number) => {
    try {
      const result = await GiftCardService.redeemGiftCard(cardNumber, amount);
      
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      
      // Add to redemptions list
      setGiftCardRedemptions([...giftCardRedemptions, { cardNumber, amount }]);
      toast.success(
        t('giftCard.redeemed', {
          defaultValue: 'Redeemed {{amount}} BGN from gift card',
          amount: amount.toFixed(2),
        })
      );
      
      if (result.newBalance > 0) {
        toast.info(
          t('giftCard.remainingBalance', {
            defaultValue: 'Remaining balance: {{balance}} BGN',
            balance: result.newBalance.toFixed(2),
          })
        );
      }
    } catch (error) {
      console.error('Failed to redeem gift card:', error);
      toast.error(t('giftCard.redeemError', 'Failed to redeem gift card'));
    }
  };

  const handleApplyStoreCredit = () => {
    if (!customer) {
      toast.error(t('storeCredit.noCustomer', 'Please select a customer first'));
      return;
    }

    if (customerCreditBalance <= 0) {
      toast.error(t('storeCredit.noBalance', 'Customer has no store credit'));
      return;
    }

    // Calculate max amount that can be applied (minimum of credit balance and remaining total)
    const remainingTotal = totalDisplay - giftCardTotal - storeCreditApplied;
    const maxApplicable = Math.min(customerCreditBalance - storeCreditApplied, remainingTotal);

    if (maxApplicable <= 0) {
      toast.warning(t('storeCredit.fullyApplied', 'Store credit already fully applied'));
      return;
    }

    setStoreCreditApplied(storeCreditApplied + maxApplicable);
    toast.success(
      t('storeCredit.applied', {
        defaultValue: 'Applied {{amount}} BGN store credit',
        amount: maxApplicable.toFixed(2),
      })
    );
  };

  const handleComplete = async () => {
    if (!canComplete) return;
    setIsProcessing(true);

    // Award points logic moved to POSScreen via LoyaltyService
    if (customer) {
      // No-op here, handled in parent
    }

    // Handle Pay It Forward items
    const payItForwardItems = items.filter(item => item.isPayItForward);
    if (payItForwardItems.length > 0) {
      try {
        const pifEntries = payItForwardItems.flatMap(item => 
          Array(item.quantity).fill(null).map(() => ({
            id: crypto.randomUUID(),
            product_id: item.product.id,
            product_name: item.product.name,
            price: item.product.sale_price,
            status: 'available' as const,
            created_at: new Date().toISOString(),
            customer_id: customer?.id,
            _dirty: true
          }))
        );
        
        await db.pay_it_forward.bulkAdd(pifEntries);
      } catch (error) {
        console.error('Failed to add Pay It Forward items:', error);
      }
    }

    // Handle Redeemed Pay It Forward items
    const redeemedItems = items.filter(item => item.redeemedFromPifId);
    if (redeemedItems.length > 0) {
      try {
        const redeemedIds = redeemedItems.map(item => item.redeemedFromPifId!).filter(Boolean);
        
        // Using Promise.all for updates
        await Promise.all(redeemedIds.map(id => 
          db.pay_it_forward.update(id, {
            status: 'redeemed',
            redeemed_at: new Date().toISOString(),
            _dirty: true
          })
        ));
      } catch (error) {
        console.error('Failed to update Redeemed items:', error);
      }
    }

    // Handle Store Credit application
    if (storeCreditApplied > 0 && customer) {
      try {
        // Create credit transaction record
        await db.credit_transactions.add({
          id: crypto.randomUUID(),
          workspace_id: '00000000-0000-0000-0000-000000000000',
          customer_id: customer.id,
          type: 'redeemed',
          amount: storeCreditApplied,
          balance_after: customerCreditBalance - storeCreditApplied,
          reason: 'Applied to purchase',
          created_at: new Date().toISOString(),
          _synced: false,
          _dirty: true,
        });

        // Update customer credit balance
        await db.customers.update(customer.id, {
          credit_balance: customerCreditBalance - storeCreditApplied,
          _dirty: true,
          _synced: false,
        });
      } catch (error) {
        console.error('Failed to process store credit:', error);
        toast.error(t('storeCredit.error', 'Failed to apply store credit'));
      }
    }

    // Simulate API call
    setTimeout(() => {
      if (method === 'split') {
        onComplete('split', total, 0, splitPayments);
      } else {
        onComplete(method, amount, changeInPaymentCurrency);
      }
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canComplete) {
      handleComplete();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const formatMoney = (amount: number, currency: 'BGN' | 'EUR') => {
    return new Intl.NumberFormat(currency === 'BGN' ? 'bg-BG' : 'de-DE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('payment.title')}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Total Amount & Currency Toggle */}
          <div className="text-center relative">
            <div className="absolute right-0 top-0">
              <button
                onClick={() => setPaymentCurrency(prev => prev === 'BGN' ? 'EUR' : 'BGN')}
                className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 transition-colors"
              >
                <ArrowRightLeft size={12} />
                {paymentCurrency}
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">{t('payment.totalAmount')}</p>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 font-mono">
              {formatMoney(totalDisplay, paymentCurrency)}
            </p>
            {giftCardTotal > 0 && (
              <div className="mt-2 p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <p className="text-xs text-purple-700 dark:text-purple-300 mb-1">
                  {t('giftCard.afterGiftCards', 'After Gift Cards')}
                </p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 font-mono">
                  {formatMoney(adjustedTotal, paymentCurrency)}
                </p>
              </div>
            )}
            {paymentCurrency === 'EUR' && (
              <p className="text-xs text-gray-400 mt-1">1 EUR = {FIXED_RATE} BGN</p>
            )}
          </div>

          {/* Gift Card Redemptions Display */}
          {giftCardRedemptions.length > 0 && (
            <div className="space-y-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-semibold text-sm">
                <Gift size={16} />
                <span>{t('giftCard.redemptions', 'Gift Card Redemptions')}</span>
              </div>
              {giftCardRedemptions.map((gc, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="font-mono text-gray-600 dark:text-slate-400">{gc.cardNumber}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-700 dark:text-purple-300">-{formatMoney(gc.amount, paymentCurrency)}</span>
                    <button
                      onClick={() => {
                        const newRedemptions = [...giftCardRedemptions];
                        newRedemptions.splice(idx, 1);
                        setGiftCardRedemptions(newRedemptions);
                      }}
                      className="text-red-500 hover:text-red-600 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-purple-200 dark:border-purple-800 flex justify-between font-bold">
                <span className="text-gray-700 dark:text-slate-300">{t('giftCard.totalApplied', 'Total Applied')}</span>
                <span className="text-purple-700 dark:text-purple-300">-{formatMoney(giftCardTotal, paymentCurrency)}</span>
              </div>
            </div>
          )}

          {/* Gift Card Button */}
          {adjustedTotal > 0 && (
            <button
              onClick={() => setIsGiftCardModalOpen(true)}
              className="w-full p-3 rounded-xl border-2 border-purple-300 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 text-purple-700 dark:text-purple-300 font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Gift size={20} />
              <span>{t('giftCard.applyGiftCard', 'Apply Gift Card')}</span>
            </button>
          )}

          {/* Store Credit Display */}
          {customer && customerCreditBalance > 0 && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                  <Wallet size={16} />
                  <span>{t('storeCredit.available', 'Available Store Credit')}</span>
                </div>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  {formatMoney(customerCreditBalance, paymentCurrency)}
                </span>
              </div>
              {storeCreditApplied > 0 && (
                <div className="flex justify-between items-center text-sm pt-2 border-t border-emerald-200 dark:border-emerald-800">
                  <span className="text-gray-600 dark:text-slate-400">{t('storeCredit.applied', 'Applied')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      -{formatMoney(storeCreditApplied, paymentCurrency)}
                    </span>
                    <button
                      onClick={() => setStoreCreditApplied(0)}
                      className="text-red-500 hover:text-red-600 p-1"
                      title={t('storeCredit.remove', 'Remove')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Store Credit Button */}
          {customer && customerCreditBalance > 0 && adjustedTotal > 0 && storeCreditApplied < customerCreditBalance && (
            <button
              onClick={handleApplyStoreCredit}
              className="w-full p-3 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/30 dark:hover:to-teal-900/30 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Wallet size={20} />
              <span>{t('storeCredit.useCredit', 'Use Store Credit')}</span>
            </button>
          )}

          {/* Payment Method Selection */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setMethod('cash')}
              className={clsx(
                "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                method === 'cash'
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 text-gray-600 dark:text-slate-400"
              )}
            >
              <Banknote size={24} />
              <span className="font-semibold text-sm">{t('payment.cash')}</span>
            </button>
            <button
              onClick={() => setMethod('card')}
              className={clsx(
                "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                method === 'card'
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 text-gray-600 dark:text-slate-400"
              )}
            >
              <CreditCard size={24} />
              <span className="font-semibold text-sm">{t('payment.card')}</span>
            </button>
            <button
              onClick={() => setMethod('split')}
              className={clsx(
                "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                method === 'split'
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 text-gray-600 dark:text-slate-400"
              )}
            >
              <PieChart size={24} />
              <span className="font-semibold text-sm">{t('payment.split')}</span>
            </button>
          </div>

          {/* Cash Input */}
          {method === 'cash' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t('payment.amountTendered')} ({paymentCurrency})
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="number"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-4 pr-4 py-3 text-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:text-white font-mono"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-800 rounded-xl relative overflow-hidden">
                <div className="flex items-center gap-2 z-10">
                  <span className="text-gray-600 dark:text-slate-400 font-medium">{t('payment.change')}</span>
                  <button
                    onClick={() => setChangeCurrency(prev => prev === 'BGN' ? 'EUR' : 'BGN')}
                    className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                    title="Switch Change Currency"
                  >
                    <ArrowRightLeft size={10} />
                    {changeCurrency}
                  </button>
                </div>
                <span className={clsx(
                  "text-xl font-bold font-mono z-10",
                  changeInPaymentCurrency >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"
                )}>
                  {formatMoney(changeDisplay, changeCurrency)}
                </span>
              </div>
            </div>
          )}

          {/* Split Payment UI */}
          {method === 'split' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <span className="font-medium text-gray-700 dark:text-slate-300">{t('payment.remaining')}</span>
                <span className={clsx("font-bold font-mono text-xl", remainingAmount > 0.01 ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400")}>
                  {formatMoney(remainingAmount, paymentCurrency)}
                </span>
              </div>
              
              {/* List of payments */}
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {splitPayments.map((p, i) => (
                  <div key={i} className="flex justify-between items-center p-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                      {p.method === 'cash' ? <Banknote size={16} /> : <CreditCard size={16} />}
                      <span className="capitalize">{t(`payment.${p.method}`)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 dark:text-white">{formatMoney(p.amount, paymentCurrency)}</span>
                      <button onClick={() => handleRemoveSplit(i)} className="text-red-500 hover:text-red-600 p-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add payment form */}
              {remainingAmount > 0.01 && (
                <div className="flex gap-2">
                  <select 
                    value={splitMethod} 
                    onChange={(e) => setSplitMethod(e.target.value as PaymentMethod)}
                    className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">{t('payment.cash')}</option>
                    <option value="card">{t('payment.card')}</option>
                    <option value="food_voucher">{t('payment.voucher')}</option>
                  </select>
                  <input
                    type="number"
                    value={splitAmount}
                    onChange={(e) => setSplitAmount(e.target.value)}
                    className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder={remainingAmount.toFixed(2)}
                    step="0.01"
                  />
                  <button 
                    onClick={handleAddSplit}
                    disabled={!canAddSplit}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
          <button
            onClick={handleComplete}
            disabled={!canComplete || isProcessing}
            className={clsx(
              "w-full py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all",
              !canComplete || isProcessing
                ? "bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl"
            )}
          >
            {isProcessing ? (
              <span>{t('payment.processing')}</span>
            ) : (
              <>
                <Check size={20} />
                <span>{t('payment.complete')}</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Gift Card Redemption Modal */}
      <GiftCardRedeemModal
        isOpen={isGiftCardModalOpen}
        onClose={() => setIsGiftCardModalOpen(false)}
        maxAmount={adjustedTotal}
        onRedeem={handleGiftCardRedeem}
      />
    </div>
  );
};
