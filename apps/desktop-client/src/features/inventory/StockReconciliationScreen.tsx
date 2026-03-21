import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Play, CheckCircle, XCircle } from 'lucide-react';
import { StockReconciliationService } from '@pulse/core-logic';
import type { StockReconciliation, ReconciliationCount } from '@pulse/core-logic';
import clsx from 'clsx';
import { toast } from 'sonner';

const DEFAULT_WORKSPACE = 'default-workspace';

export function StockReconciliationScreen() {
  const [reconciliations, setReconciliations] = useState<StockReconciliation[]>([]);
  const [activeRecon, setActiveRecon] = useState<StockReconciliation | null>(null);
  const [counts, setCounts] = useState<ReconciliationCount[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    loadReconciliations();
  }, []);

  const loadReconciliations = async () => {
    const recons = await StockReconciliationService.getReconciliations(DEFAULT_WORKSPACE);
    setReconciliations(recons);
    const active = recons.find(r => r.status === 'in_progress');
    if (active) {
      setActiveRecon(active);
      const c = await StockReconciliationService.getCounts(active.id);
      setCounts(c);
    }
  };

  const handleStartNew = async () => {
    try {
      const recon = await StockReconciliationService.startReconciliation({
        workspaceId: DEFAULT_WORKSPACE,
        startedBy: 'current-user',
      });
      setActiveRecon(recon);
      const c = await StockReconciliationService.getCounts(recon.id);
      setCounts(c);
      await loadReconciliations();
      toast.success(`Reconciliation started with ${c.length} products`);
    } catch (error: any) {
      console.error('[StockRecon] Start failed:', error);
      toast.error(error.message === 'RECONCILIATION_IN_PROGRESS' ? 'A reconciliation is already in progress' : 'Failed to start');
    }
  };

  const handleUpdateCount = async (countId: string, quantity: number) => {
    try {
      await StockReconciliationService.updateCount(countId, quantity, 'current-user');
      if (activeRecon) {
        const c = await StockReconciliationService.getCounts(activeRecon.id);
        setCounts(c);
        const updated = await StockReconciliationService.getReconciliation(activeRecon.id);
        if (updated) setActiveRecon(updated);
      }
    } catch (error) {
      console.error('[StockRecon] Update count failed:', error);
      toast.error('Failed to update count');
    }= async () => {
    if (!activeRecon) return;
    try {
      const adjustments = await StockReconciliationService.completeReconciliation(activeRecon.id, 'current-user', true);
      toast.success(`Reconciliation completed. ${adjustments.length} adjustments applied.`);
      setActiveRecon(null);
      setCounts([]);
      await loadReconciliations();
    } catch (error) {
      console.error('[StockRecon] Complete failed:', error);
      toast.error('Failed to complete reconciliation');
    }
  };

  const handleCancel = async () => {
    if (!activeRecon) return;
    await StockReconciliationService.cancelReconciliation(activeRecon.id);
    toast.success('Reconciliation cancelled');
    setActiveRecon(null);
    setCounts([]);
    await loadReconciliations();
  };

  const filteredCounts = counts.filter(c =>
    c.product_name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Stock Reconciliation</h2>
        {!activeRecon && (
          <button onClick={handleStartNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Play className="w-4 h-4" />
            Start New Reconciliation
          </button>
        )}
      </div>

      {activeRecon && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Progress: {activeRecon.counted_products}/{activeRecon.total_products} counted</span>
              <div className="flex gap-2">
                <button onClick={handleComplete} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Complete
                </button>
                <button onClick={handleCancel} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${activeRecon.total_products > 0 ? (activeRecon.counted_products / activeRecon.total_products) * 100 : 0}%` }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Total Variance: <span className={clsx('font-medium', activeRecon.total_variance !== 0 ? 'text-red-600' : 'text-green-600')}>{activeRecon.total_variance} units (€{activeRecon.total_variance_value.toFixed(2)})</span>
            </div>
          </div>

          {/* Search */}
          <input
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search products..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
          />

          {/* Count Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700">
                  <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Product</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">System Qty</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Counted Qty</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Variance</th>
                </tr>
              </thead>
              <tbody>
                {filteredCounts.map(c => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-slate-700">
                    <td className="py-2 px-3">{c.product_name}</td>
                    <td className="py-2 px-3 text-right text-gray-500">{c.system_quantity}</td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        value={c.counted_quantity}
                        onChange={(e) => handleUpdateCount(c.id, parseInt(e.target.value) || 0)}
                        className="w-20 text-right px-2 py-1 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700"
                      />
                    </td>
                    <td className={clsx('py-2 px-3 text-right font-medium', c.variance !== 0 ? 'text-red-600' : 'text-gray-500')}>
                      {c.variance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History */}
      {!activeRecon && reconciliations.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <h3 className="font-medium mb-3">Reconciliation History</h3>
          <div className="space-y-2">
            {reconciliations.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-slate-700 rounded-lg text-sm">
                <div>
                  <span className="font-medium">{r.started_at ? new Date(r.started_at).toLocaleDateString() : 'Unknown'}</span>
                  <span className={clsx('ml-2 px-2 py-0.5 rounded-full text-xs',
                    r.status === 'completed' ? 'bg-green-100 text-green-700' :
                    r.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  )}>
                    {r.status}
                  </span>
                </div>
                <span className="text-gray-500">{r.total_products} products | Variance: {r.total_variance}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
