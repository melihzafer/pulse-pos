import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Clock, CheckCircle2, XCircle, Eye, DollarSign, AlertCircle } from 'lucide-react';
import { LayawayService } from '@pulse/core-logic';
import type { LayawayOrder } from '@pulse/core-logic';
import { toast } from 'sonner';
import { CreateLayawayModal } from './CreateLayawayModal';
import { ViewLayawayModal } from './ViewLayawayModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import clsx from 'clsx';

const WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

export const LayawayScreen: React.FC = () => {
  const [layawayOrders, setLayawayOrders] = useState<LayawayOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<LayawayOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    activeOrders: 0,
    totalValue: 0,
    totalCollected: 0,
    totalOutstanding: 0,
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedLayaway, setSelectedLayaway] = useState<string | null>(null);

  useEffect(() => {
    loadLayawayOrders();
    loadStats();
  }, []);

  const filterOrders = useCallback(() => {
    let filtered = layawayOrders;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Search by order number or customer name
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.order_number.toLowerCase().includes(term) ||
          (order.notes && order.notes.toLowerCase().includes(term))
      );
    }

    setFilteredOrders(filtered);
  }, [layawayOrders, statusFilter, searchTerm]);

  useEffect(() => {
    filterOrders();
  }, [filterOrders]);

  const loadLayawayOrders = async () => {
    try {
      const orders = await LayawayService.getLayawayOrders(WORKSPACE_ID);
      setLayawayOrders(orders);
    } catch (error) {
      console.error('Failed to load layaway orders:', error);
      toast.error('Failed to load layaway orders');
    }
  };

  const loadStats = async () => {
    try {
      const stats = await LayawayService.getLayawayStats(WORKSPACE_ID);
      setStats(stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleCreateLayaway = async () => {
    await loadLayawayOrders();
    await loadStats();
    setIsCreateModalOpen(false);
    toast.success('Layaway order created successfully');
  };

  const handleViewLayaway = (layawayId: string) => {
    setSelectedLayaway(layawayId);
    setIsViewModalOpen(true);
  };

  const handleRecordPayment = (layawayId: string) => {
    setSelectedLayaway(layawayId);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentRecorded = async () => {
    await loadLayawayOrders();
    await loadStats();
    setIsPaymentModalOpen(false);
    toast.success('Payment recorded successfully');
  };

  const handleCompleteLayaway = async (layawayId: string) => {
    try {
      await LayawayService.completeLayaway(layawayId);
      await loadLayawayOrders();
      await loadStats();
      setIsViewModalOpen(false);
      toast.success('Layaway order completed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete layaway');
    }
  };

  const handleCancelLayaway = async (layawayId: string) => {
    try {
      const result = await LayawayService.cancelLayaway(layawayId, true);
      await loadLayawayOrders();
      await loadStats();
      setIsViewModalOpen(false);
      toast.success(`Layaway cancelled. Refund: ${result.refundAmount.toFixed(2)} BGN`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel layaway');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Clock size={12} />
            Active
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 size={12} />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XCircle size={12} />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700 px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
              Layaway Orders
            </h1>
            <p className="text-gray-600 dark:text-slate-400 mt-1">
              Manage installment purchases and payment schedules
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
          >
            <Plus size={20} />
            Create Layaway
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Active Orders</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.activeOrders}</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
            <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">Total Value</div>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {stats.totalValue.toFixed(2)} BGN
            </div>
          </div>
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-violet-100 dark:border-violet-800">
            <div className="text-sm text-violet-600 dark:text-violet-400 font-medium mb-1">Collected</div>
            <div className="text-2xl font-bold text-violet-900 dark:text-violet-100">
              {stats.totalCollected.toFixed(2)} BGN
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
            <div className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-1">Outstanding</div>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
              {stats.totalOutstanding.toFixed(2)} BGN
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 bg-white/60 backdrop-blur-sm dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-700 px-8 py-4">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search by order number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            {(['all', 'active', 'completed', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={clsx(
                  'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600'
                )}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Layaway Orders Table */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500">
            <AlertCircle size={48} className="mb-4" />
            <p className="text-lg font-medium">No layaway orders found</p>
            <p className="text-sm">Create a new layaway order to get started</p>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm dark:bg-slate-800/80 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Deposit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Balance Due
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredOrders.map((order) => {
                  const progress = ((order.total - order.balance_due) / order.total) * 100;
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {order.order_number}
                        </div>
                        {order.notes && (
                          <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            {order.notes.substring(0, 30)}
                            {order.notes.length > 30 && '...'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(order.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                        {order.total.toFixed(2)} BGN
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600 dark:text-slate-300">
                        {order.deposit_amount.toFixed(2)} BGN
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-amber-600 dark:text-amber-400">
                        {order.balance_due.toFixed(2)} BGN
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-slate-400 w-10 text-right">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          {order.status === 'active' && (
                            <button
                              onClick={() => handleRecordPayment(order.id)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                              title="Record Payment"
                            >
                              <DollarSign size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleViewLayaway(order.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateLayawayModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateLayaway}
        />
      )}

      {isViewModalOpen && selectedLayaway && (
        <ViewLayawayModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedLayaway(null);
          }}
          layawayId={selectedLayaway}
          onComplete={handleCompleteLayaway}
          onCancel={handleCancelLayaway}
          onRecordPayment={() => {
            setIsViewModalOpen(false);
            handleRecordPayment(selectedLayaway);
          }}
        />
      )}

      {isPaymentModalOpen && selectedLayaway && (
        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedLayaway(null);
          }}
          layawayId={selectedLayaway}
          onSuccess={handlePaymentRecorded}
        />
      )}
    </div>
  );
};
