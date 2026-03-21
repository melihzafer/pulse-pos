import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { CommissionService, db } from '@pulse/core-logic';
import type { CommissionEarned, User } from '@pulse/core-logic';
import clsx from 'clsx';
import { toast } from 'sonner';

const DEFAULT_WORKSPACE = 'default-workspace';

export function CommissionReport() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [summary, setSummary] = useState<{
    totalEarned: number;
    pending: number;
    approved: number;
    paid: number;
    transactionCount: number;
  } | null>(null);
  const [transactions, setTransactions] = useState<CommissionEarned[]>([]);

  useEffect(() => {
    db.users.toArray().then(setUsers);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadData();
    }
  }, [selectedUser, dateRange]);

  const loadData = async () => {
    const s = await CommissionService.getSummary(selectedUser, DEFAULT_WORKSPACE, dateRange.start, dateRange.end);
    setSummary(s);

    const tx = await db.commission_earned
      .where('user_id')
      .equals(selectedUser)
      .filter((e: any) =>
        e.workspace_id === DEFAULT_WORKSPACE &&
        (e.created_at || '') >= dateRange.start &&
        (e.created_at || '') <= dateRange.end
      )
      .toArray();
    setTransactions(tx);
  };

  const handlePayout = async () => {
    if (!selectedUser) return;
    try {
      const payout = await CommissionService.processPayout({
        workspaceId: DEFAULT_WORKSPACE,
        userId: selectedUser,
        periodStart: dateRange.start,
        periodEnd: dateRange.end,
      });
      toast.success(`Payout of €${payout.amount.toFixed(2)} processed`);
      await loadData();
    } catch (error: any) {
      console.error('[CommissionReport] Payout failed:', error);
      toast.error(error.message === 'NO_PENDING_COMMISSIONS' ? 'No pending commissions to pay out' : 'Payout failed');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Commission Report</h2>

      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Employee</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm min-w-[200px]"
          >
            <option value="">Select employee...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
          />
        </div>
      </div>

      {summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
              <DollarSign className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <div className="text-2xl font-bold">€{summary.totalEarned.toFixed(2)}</div>
              <div className="text-xs text-gray-500">Total Earned</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <div className="text-2xl font-bold text-amber-600">€{summary.pending.toFixed(2)}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-500" />
              <div className="text-2xl font-bold text-green-600">€{summary.paid.toFixed(2)}</div>
              <div className="text-xs text-gray-500">Paid Out</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-purple-500" />
              <div className="text-2xl font-bold">{summary.transactionCount}</div>
              <div className="text-xs text-gray-500">Transactions</div>
            </div>
          </div>

          {/* Payout Button */}
          {summary.pending > 0 && (
            <button onClick={handlePayout} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
              Process Payout (€{summary.pending.toFixed(2)})
            </button>
          )}
        </>
      )}

      {/* Transaction Table */}
      {transactions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700">
                <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Date</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Sale</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Rate</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Amount</th>
                <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} className="border-b border-gray-100 dark:border-slate-700">
                  <td className="py-2 px-3">{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '-'}</td>
                  <td className="py-2 px-3 text-gray-500">{tx.sale_id?.substring(0, 8) || '-'}</td>
                  <td className="py-2 px-3">{tx.rate_type}: {tx.rate_value}</td>
                  <td className="py-2 px-3 text-right font-medium">€{tx.amount.toFixed(2)}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium',
                      tx.status === 'paid' ? 'bg-green-100 text-green-700' :
                      tx.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    )}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
