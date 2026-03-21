import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, AlertTriangle, DollarSign, PauseCircle, PlayCircle } from 'lucide-react';
import { DebtService, db } from '@pulse/core-logic';
import type { CustomerDebtAccount, DebtTransaction, Customer } from '@pulse/core-logic';
import clsx from 'clsx';
import { toast } from 'sonner';

export function CustomerDebtScreen() {
  const [accounts, setAccounts] = useState<(CustomerDebtAccount & { customer_name?: string })[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [transactions, setTransactions] = useState<DebtTransaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccountCustomerId, setNewAccountCustomerId] = useState('');
  const [newAccountLimit, setNewAccountLimit] = useState('0');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const DEFAULT_WORKSPACE = 'default-workspace';

  useEffect(() => {
    loadAccounts();
    db.customers.toArray().then(setCustomers);
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      DebtService.getTransactions(selectedAccount).then(setTransactions);
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    const accs = await DebtService.getAllAccounts(DEFAULT_WORKSPACE);
    const withNames = await Promise.all(accs.map(async (a) => {
      const customer = await db.customers.get(a.customer_id);
      return { ...a, customer_name: customer?.name || 'Unknown' };
    }));
    setAccounts(withNames);
  };

  const handleCreateAccount = async () => {
    if (!newAccountCustomerId) return;
    try {
      await DebtService.createAccount({
        workspaceId: DEFAULT_WORKSPACE,
        customerId: newAccountCustomerId,
        creditLimit: parseFloat(newAccountLimit) || 0,
      });
      toast.success('Debt account created');
      setShowNewAccount(false);
      setNewAccountCustomerId('');
      setNewAccountLimit('0');
      await loadAccounts();
    } catch (error: any) {
      console.error('[CustomerDebt] Create account failed:', error);
      toast.error(error.message === 'ACCOUNT_EXISTS' ? 'Account already exists for this customer' : 'Failed to create account');
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedAccount || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid positive amount'); return; }
    try {
      await DebtService.recordTransaction({
        workspaceId: DEFAULT_WORKSPACE,
        accountId: selectedAccount,
        customerId: accounts.find(a => a.id === selectedAccount)?.customer_id || '',
        type: 'payment',
        amount,
        createdBy: 'current-user',
        notes: 'Manual payment',
      });
      toast.success('Payment recorded');
      setPaymentAmount('');
      await loadAccounts();
      setTransactions(await DebtService.getTransactions(selectedAccount));
    } catch (error: any) {
      console.error('[CustomerDebt] Payment failed:', error);
      toast.error('Failed to record payment');
    }
  };

  const handleRecordCharge = async () => {
    if (!selectedAccount || !chargeAmount) return;
    const amount = parseFloat(chargeAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid positive amount'); return; }
    try {
      await DebtService.recordTransaction({
        workspaceId: DEFAULT_WORKSPACE,
        accountId: selectedAccount,
        customerId: accounts.find(a => a.id === selectedAccount)?.customer_id || '',
        type: 'charge',
        amount,
        createdBy: 'current-user',
        notes: 'Manual charge',
      });
      toast.success('Charge recorded');
      setChargeAmount('');
      await loadAccounts();
      setTransactions(await DebtService.getTransactions(selectedAccount));
    } catch (error: any) {
      console.error('[CustomerDebt] Charge failed:', error);
      toast.error(error.message === 'CREDIT_LIMIT_EXCEEDED' ? 'Credit limit exceeded' : 'Failed to record charge');
    }
  };

  const handleToggleAccount = async (accountId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'active') {
        await DebtService.suspendAccount(accountId);
        toast.success('Account suspended');
      } else {
        await DebtService.reactivateAccount(accountId);
        toast.success('Account reactivated');
      }
      await loadAccounts();
    } catch (error) {
      toast.error('Failed to update account');
    }
  };

  const account = accounts.find(a => a.id === selectedAccount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Customer Debt Accounts</h2>
        <button
          onClick={() => setShowNewAccount(!showNewAccount)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          New Account
        </button>
      </div>

      {/* New Account Form */}
      {showNewAccount && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex gap-3">
            <select
              value={newAccountCustomerId}
              onChange={(e) => setNewAccountCustomerId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
            >
              <option value="">Select customer...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="number"
              value={newAccountLimit}
              onChange={(e) => setNewAccountLimit(e.target.value)}
              placeholder="Credit limit"
              className="w-32 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
            />
            <button onClick={handleCreateAccount} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
              Create
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Account List */}
        <div className="col-span-1 space-y-2">
          {accounts.map(a => (
            <div
              key={a.id}
              onClick={() => setSelectedAccount(a.id)}
              className={clsx(
                'p-3 rounded-lg cursor-pointer border transition-colors',
                selectedAccount === a.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 bg-white dark:bg-slate-800'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{a.customer_name}</span>
                <span className={clsx(
                  'px-2 py-0.5 rounded-full text-xs',
                  a.status === 'active' ? 'bg-green-100 text-green-700' :
                  a.status === 'suspended' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-700'
                )}>
                  {a.status}
                </span>
              </div>
              <div className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                €{a.current_balance.toFixed(2)}
              </div>
              {a.credit_limit > 0 && (
                <div className="text-xs text-gray-500">Limit: €{a.credit_limit.toFixed(2)}</div>
              )}
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="text-center text-gray-400 py-8 text-sm">No debt accounts yet</div>
          )}
        </div>

        {/* Account Detail */}
        <div className="col-span-2">
          {account ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
                  <DollarSign className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                  <div className="text-2xl font-bold">€{account.current_balance.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Current Balance</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
                  <CreditCard className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                  <div className="text-2xl font-bold">€{account.credit_limit.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Credit Limit</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                  <div className="text-2xl font-bold">
                    {account.credit_limit > 0
                      ? `${Math.round((account.current_balance / account.credit_limit) * 100)}%`
                      : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">Utilization</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Payment amount" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm" />
                <button onClick={handleRecordPayment} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">Record Payment</button>
                <input type="number" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} placeholder="Charge amount" className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm" />
                <button onClick={handleRecordCharge} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm">Record Charge</button>
                <button onClick={() => handleToggleAccount(account.id, account.status)} className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                  {account.status === 'active' ? <PauseCircle className="w-5 h-5 text-amber-500" /> : <PlayCircle className="w-5 h-5 text-green-500" />}
                </button>
              </div>

              {/* Transaction History */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                <h4 className="font-medium mb-3">Transaction History</h4>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-2 px-2 border-b border-gray-100 dark:border-slate-700 last:border-0 text-sm">
                      <div>
                        <span className={clsx(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          tx.type === 'payment' ? 'bg-green-100 text-green-700' :
                          tx.type === 'charge' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        )}>
                          {tx.type}
                        </span>
                        <span className="ml-2 text-gray-500">{tx.notes || ''}</span>
                      </div>
                      <div className="text-right">
                        <span className={clsx('font-medium', tx.amount < 0 ? 'text-green-600' : 'text-red-600')}>
                          {tx.amount < 0 ? '-' : '+'}€{Math.abs(tx.amount).toFixed(2)}
                        </span>
                        <div className="text-xs text-gray-400">{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : ''}</div>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div className="text-center text-gray-400 py-4 text-sm">No transactions yet</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Select an account to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
