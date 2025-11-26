import React, { useState, useEffect } from 'react';
import { X, DollarSign, Lock, Unlock, AlertTriangle, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db, Shift, CashTransaction, formatCurrency } from '@pulse/core-logic';
import { toast } from 'sonner';
import clsx from 'clsx';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [startCash, setStartCash] = useState('');
  const [endCash, setEndCash] = useState('');
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [payInOutAmount, setPayInOutAmount] = useState('');
  const [payInOutReason, setPayInOutReason] = useState('');
  const [showPayInOut, setShowPayInOut] = useState<'in' | 'out' | null>(null);
  const [blindClose, setBlindClose] = useState(false);
  const [requirePayReason, setRequirePayReason] = useState(true);

  useEffect(() => {
    const loadSettings = () => {
      const savedSettings = localStorage.getItem('pulse-settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.blindClose !== undefined) setBlindClose(parsed.blindClose);
          if (parsed.requirePayReason !== undefined) setRequirePayReason(parsed.requirePayReason);
        } catch (e) {
          console.error('Failed to load settings:', e);
        }
      }
    };

    loadSettings();

    const handleSettingsChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (customEvent.detail.blindClose !== undefined) setBlindClose(customEvent.detail.blindClose);
        if (customEvent.detail.requirePayReason !== undefined) setRequirePayReason(customEvent.detail.requirePayReason);
      } else {
        loadSettings();
      }
    };

    window.addEventListener('pulse-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('pulse-settings-changed', handleSettingsChange);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCurrentShift();
    }
  }, [isOpen]);

  const loadCurrentShift = async () => {
    setLoading(true);
    try {
      // Find open shift
      const openShift = await db.shifts.where('status').equals('open').first();
      
      if (openShift) {
        setCurrentShift(openShift);
        // Load transactions for this shift
        const txs = await db.cash_transactions.where('shift_id').equals(openShift.id).toArray();
        setTransactions(txs);
      } else {
        setCurrentShift(null);
      }
    } catch (error) {
      console.error('Failed to load shift:', error);
      toast.error('Failed to load shift data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartShift = async () => {
    const amount = parseFloat(startCash);
    if (isNaN(amount) || amount < 0) {
      toast.error('Invalid start cash amount');
      return;
    }

    try {
      const newShift: Shift = {
        id: crypto.randomUUID(),
        workspace_id: '00000000-0000-0000-0000-000000000000', // TODO: Get from settings
        start_time: new Date().toISOString(),
        start_cash: amount,
        status: 'open',
      };

      await db.shifts.add(newShift);
      setCurrentShift(newShift);
      setStartCash('');
      toast.success(t('shift.messages.started'));
    } catch (error) {
      console.error('Failed to start shift:', error);
      toast.error(t('shift.messages.startError'));
    }
  };

  const handleEndShift = async () => {
    if (!currentShift) return;

    const actualCash = parseFloat(endCash);
    if (isNaN(actualCash) || actualCash < 0) {
      toast.error(t('shift.messages.invalidAmount'));
      return;
    }

    try {
      // Calculate expected cash
      // Start Cash + Sales (Cash) + Pay Ins - Pay Outs - Refunds (Cash)
      // For now, we'll just sum transactions. Ideally we query sales too.
      
      // Get cash sales for this shift period
      const sales = await db.sales
        .where('created_at')
        .aboveOrEqual(currentShift.start_time)
        .and(sale => sale.payment_method === 'cash' || (sale.payments?.some(p => p.method === 'cash') ?? false))
        .toArray();

      let cashSalesTotal = 0;
      sales.forEach(sale => {
        if (sale.payment_method === 'cash') {
          cashSalesTotal += sale.total_amount;
        } else if (sale.payments) {
          const cashPayment = sale.payments.find(p => p.method === 'cash');
          if (cashPayment) cashSalesTotal += cashPayment.amount;
        }
      });

      const payIns = transactions.filter(t => t.type === 'pay_in').reduce((sum, t) => sum + t.amount, 0);
      const payOuts = transactions.filter(t => t.type === 'pay_out').reduce((sum, t) => sum + t.amount, 0);
      
      const expectedCash = currentShift.start_cash + cashSalesTotal + payIns - payOuts;
      const difference = actualCash - expectedCash;

      await db.shifts.update(currentShift.id, {
        end_time: new Date().toISOString(),
        end_cash_actual: actualCash,
        end_cash_expected: expectedCash,
        status: 'closed',
      });

      setCurrentShift(null);
      setEndCash('');
      setTransactions([]);
      
      if (blindClose) {
        toast.success(t('shift.messages.closed'));
      } else {
        if (Math.abs(difference) > 0.01) {
          toast.warning(`${t('shift.messages.closedWithDifference')} ${formatCurrency(difference)}`);
        } else {
          toast.success(t('shift.messages.closed'));
        }
      }
      onClose();
    } catch (error) {
      console.error('Failed to end shift:', error);
      toast.error(t('shift.messages.closeError'));
    }
  };

  const handlePayInOut = async () => {
    if (!currentShift || !showPayInOut) return;

    const amount = parseFloat(payInOutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t('shift.messages.amountInvalid'));
      return;
    }

    if (requirePayReason && !payInOutReason.trim()) {
      toast.error(t('shift.messages.reasonRequired'));
      return;
    }

    try {
      const tx: CashTransaction = {
        id: crypto.randomUUID(),
        shift_id: currentShift.id,
        type: showPayInOut === 'in' ? 'pay_in' : 'pay_out',
        amount,
        reason: payInOutReason,
        created_at: new Date().toISOString(),
      };

      await db.cash_transactions.add(tx);
      setTransactions([...transactions, tx]);
      setShowPayInOut(null);
      setPayInOutAmount('');
      setPayInOutReason('');
      toast.success(showPayInOut === 'in' ? t('shift.messages.cashInRecorded') : t('shift.messages.cashOutRecorded'));
    } catch (error) {
      console.error('Failed to record transaction:', error);
      toast.error(t('shift.messages.transactionError'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {currentShift ? <Unlock className="text-green-500" /> : <Lock className="text-red-500" />}
            {currentShift ? t('shift.management') : t('shift.start')}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
          ) : !currentShift ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                <p className="text-blue-800 dark:text-blue-200 mb-2 font-medium">{t('shift.enterStartCash')}</p>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    value={startCash}
                    onChange={(e) => setStartCash(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-lg font-mono"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>
              <button
                onClick={handleStartShift}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-colors"
              >
                {t('shift.openShift')}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-slate-400">{t('shift.startTime')}</p>
                  <p className="font-mono font-bold text-gray-900 dark:text-white">
                    {new Date(currentShift.start_time).toLocaleTimeString()}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-slate-400">{t('shift.startCash')}</p>
                  <p className="font-mono font-bold text-gray-900 dark:text-white">
                    {formatCurrency(currentShift.start_cash)}
                  </p>
                </div>
              </div>

              {/* Cash Management Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowPayInOut('in')}
                  className="p-3 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  {t('shift.payIn')}
                </button>
                <button
                  onClick={() => setShowPayInOut('out')}
                  className="p-3 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  {t('shift.payOut')}
                </button>
              </div>

              {/* Pay In/Out Form */}
              {showPayInOut && (
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl animate-in slide-in-from-top-2">
                  <h3 className="font-bold mb-3 text-gray-900 dark:text-white">
                    {showPayInOut === 'in' ? t('shift.payIn') : t('shift.payOut')}
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="number"
                      value={payInOutAmount}
                      onChange={(e) => setPayInOutAmount(e.target.value)}
                      placeholder={t('common.amount')}
                      className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={payInOutReason}
                      onChange={(e) => setPayInOutReason(e.target.value)}
                      placeholder={t('common.reason')}
                      className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPayInOut(null)}
                        className="flex-1 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handlePayInOut}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg"
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Transactions */}
              {transactions.length > 0 && (
                <div>
                  <h3 className="font-bold mb-2 text-gray-900 dark:text-white flex items-center gap-2">
                    <History size={16} />
                    {t('shift.transactions')}
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-800 rounded-lg text-sm">
                        <div>
                          <span className={clsx(
                            "font-bold mr-2",
                            tx.type === 'pay_in' ? "text-green-600" : "text-red-600"
                          )}>
                            {tx.type === 'pay_in' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>
                          <span className="text-gray-500 dark:text-slate-400">{tx.reason || t('common.noReason')}</span>
                        </div>
                        <span className="text-gray-400 text-xs">
                          {new Date(tx.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <hr className="border-gray-200 dark:border-slate-700" />

              {/* Close Shift */}
              <div>
                <h3 className="font-bold mb-3 text-gray-900 dark:text-white">{t('shift.closeShift')}</h3>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800 mb-4">
                  <p className="text-orange-800 dark:text-orange-200 mb-2 font-medium flex items-center gap-2">
                    <AlertTriangle size={18} />
                    {t('shift.countCashDrawer')}
                  </p>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="number"
                      value={endCash}
                      onChange={(e) => setEndCash(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-lg font-mono"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <button
                  onClick={handleEndShift}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg transition-colors"
                >
                  {t('shift.closeShift')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
