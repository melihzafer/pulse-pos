import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, Package } from 'lucide-react';
import { BatchService } from '@pulse/core-logic';
import type { ProductBatch } from '@pulse/core-logic';
import clsx from 'clsx';
import { toast } from 'sonner';

const DEFAULT_WORKSPACE = 'default-workspace';

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function BatchTrackingScreen() {
  const [activeTab, setActiveTab] = useState<'all' | 'expiring'>('all');
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [expiring, setExpiring] = useState<ProductBatch[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allBatches = await BatchService.getActiveBatches(DEFAULT_WORKSPACE);
    setBatches(allBatches);

    const exp = await BatchService.getExpiringSoon(DEFAULT_WORKSPACE, 30);
    setExpiring(exp);

    await BatchService.markExpiredBatches(DEFAULT_WORKSPACE);
  };

  const handleWaste = async (batchId: string) => {
    try {
      await BatchService.wasteExpiredBatch(batchId);
      toast.success('Batch marked as waste');
      await loadData();
    } catch (error) {
      console.error('[BatchTracking] Waste failed:', error);
      toast.error('Failed to record waste');
    }
  };

  const displayBatches = activeTab === 'expiring' ? expiring : batches;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Batch & Lot Tracking</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={clsx('px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'all' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Package className="w-4 h-4 inline mr-1" />
          All Batches ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab('expiring')}
          className={clsx('px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'expiring' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          Expiring Soon ({expiring.length})
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700">
              <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Batch #</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Lot #</th>
              <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Quantity</th>
              <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Expiry</th>
              <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
              <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayBatches.map(batch => (
              <tr key={batch.id} className="border-b border-gray-100 dark:border-slate-700">
                <td className="py-2 px-3">{batch.batch_number || '-'}</td>
                <td className="py-2 px-3">{batch.lot_number || '-'}</td>
                <td className="py-2 px-3 text-right">{batch.quantity}</td>
                <td className="py-2 px-3">
                  {batch.expiry_date ? (
                    <span className={clsx(
                      daysUntil(batch.expiry_date) <= 7 ? 'text-red-600 font-medium' :
                      daysUntil(batch.expiry_date) <= 30 ? 'text-amber-600' : ''
                    )}>
                      {new Date(batch.expiry_date).toLocaleDateString()}
                      {daysUntil(batch.expiry_date) <= 30 && ` (${daysUntil(batch.expiry_date)}d)`}
                    </span>
                  ) : '-'}
                </td>
                <td className="py-2 px-3 text-center">
                  <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium',
                    batch.is_expired ? 'bg-red-100 text-red-700' :
                    batch.is_depleted ? 'bg-gray-100 text-gray-700' :
                    'bg-green-100 text-green-700'
                  )}>
                    {batch.is_expired ? 'Expired' : batch.is_depleted ? 'Depleted' : 'Active'}
                  </span>
                </td>
                <td className="py-2 px-3 text-center">
                  {(batch.is_expired || (batch.expiry_date && daysUntil(batch.expiry_date) <= 0)) && batch.quantity > 0 && (
                    <button onClick={() => handleWaste(batch.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">
                      <Trash2 className="w-3 h-3 inline mr-1" />
                      Waste
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {displayBatches.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">No batches found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
