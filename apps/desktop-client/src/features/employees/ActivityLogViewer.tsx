import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  User,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Plus,
  Shield,
  DollarSign,
  Package,
  ShoppingCart,
  RefreshCw,
} from 'lucide-react';
import { AuthService } from '@pulse/core-logic';
import { RequirePermission } from '../../components/RequirePermission';

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login: <LogIn className="w-4 h-4" />,
  logout: <LogOut className="w-4 h-4" />,
  create: <Plus className="w-4 h-4" />,
  update: <Edit className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
  sale: <ShoppingCart className="w-4 h-4" />,
  refund: <RefreshCw className="w-4 h-4" />,
  inventory_adjust: <Package className="w-4 h-4" />,
  permission_change: <Shield className="w-4 h-4" />,
  payment: <DollarSign className="w-4 h-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  logout: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  create: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  update: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  delete: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  sale: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  refund: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  inventory_adjust: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  permission_change: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
  payment: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
};

const ENTITY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'user', label: 'Users' },
  { value: 'sale', label: 'Sales' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'customer', label: 'Customers' },
  { value: 'role', label: 'Roles' },
  { value: 'settings', label: 'Settings' },
];

const ACTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'sale', label: 'Sale' },
  { value: 'refund', label: 'Refund' },
];

const ITEMS_PER_PAGE = 50;

export const ActivityLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [logsData, usersData] = await Promise.all([
        AuthService.getActivityLogs({
          limit: 500,
          userId: filterUserId || undefined,
          action: filterAction || undefined,
          entityType: filterEntityType || undefined,
          startDate: dateFrom ? new Date(dateFrom) : undefined,
          endDate: dateTo ? new Date(dateTo + 'T23:59:59') : undefined,
        }),
        AuthService.getAllUsers(),
      ]);
      setLogs(logsData as ActivityLog[]);
      setUsers(usersData as User[]);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filterUserId, filterAction, filterEntityType, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
  };

  // Filter logs by search term
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.entity_type.toLowerCase().includes(term) ||
      getUserName(log.user_id).toLowerCase().includes(term) ||
      (log.entity_id?.toLowerCase().includes(term) ?? false)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const clearFilters = () => {
    setFilterUserId('');
    setFilterAction('');
    setFilterEntityType('');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
  };

  const hasActiveFilters = filterUserId || filterAction || filterEntityType || dateFrom || dateTo;

  return (
    <RequirePermission permission={['admin.users', 'reports.view']} showAccessDenied>
      <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Activity Log</h1>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Track all system activities and changes
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span className="font-medium">Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-indigo-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-slate-700 border-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    User
                  </label>
                  <select
                    value={filterUserId}
                    onChange={(e) => setFilterUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">All Users</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    Action
                  </label>
                  <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    {ACTIONS.map(action => (
                      <option key={action.value} value={action.value}>{action.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    Entity Type
                  </label>
                  <select
                    value={filterEntityType}
                    onChange={(e) => setFilterEntityType(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    {ENTITY_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="w-16 h-16 text-gray-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No activities found
              </h3>
              <p className="text-gray-600 dark:text-slate-400">
                {hasActiveFilters ? 'Try adjusting your filters' : 'Activity will appear here as actions are performed'}
              </p>
            </div>
          ) : (
            <>
              {/* Results Count */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Showing {paginatedLogs.length} of {filteredLogs.length} activities
                </p>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                {paginatedLogs.map((log, index) => {
                  const prevLog = paginatedLogs[index - 1];
                  const showDateHeader = !prevLog || 
                    new Date(log.created_at).toDateString() !== new Date(prevLog.created_at).toDateString();

                  return (
                    <React.Fragment key={log.id}>
                      {showDateHeader && (
                        <div className="flex items-center gap-3 py-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-500 dark:text-slate-400">
                            {formatDateHeader(new Date(log.created_at))}
                          </span>
                          <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                        </div>
                      )}
                      <ActivityLogItem
                        log={log}
                        userName={getUserName(log.user_id)}
                      />
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-slate-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </RequirePermission>
  );
};

interface ActivityLogItemProps {
  log: ActivityLog;
  userName: string;
}

const ActivityLogItem: React.FC<ActivityLogItemProps> = ({ log, userName }) => {
  const [expanded, setExpanded] = useState(false);
  const iconColorClass = ACTION_COLORS[log.action] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  const icon = ACTION_ICONS[log.action] || <FileText className="w-4 h-4" />;

  return (
    <div 
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColorClass}`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 dark:text-white">
              {userName}
            </span>
            <span className="text-gray-500 dark:text-slate-400">
              {formatAction(log.action)}
            </span>
            {log.entity_type && (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 rounded">
                {log.entity_type}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {log.entity_id && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                ID: {log.entity_id.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && log.details && Object.keys(log.details).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Details</p>
          <pre className="text-xs bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 overflow-x-auto text-gray-700 dark:text-slate-300">
            {JSON.stringify(log.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

function formatDateHeader(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }
}

function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    login: 'logged in',
    logout: 'logged out',
    create: 'created',
    update: 'updated',
    delete: 'deleted',
    sale: 'completed a sale',
    refund: 'processed a refund',
    inventory_adjust: 'adjusted inventory',
    permission_change: 'changed permissions',
    payment: 'processed payment',
  };
  return actionMap[action] || action;
}
