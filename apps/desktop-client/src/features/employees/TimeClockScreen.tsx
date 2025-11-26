import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Play,
  Square,
  Coffee,
  Calendar,
  Timer,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import { TimeClockService, useAuthStore } from '@pulse/core-logic';

interface TimeClockEntry {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out?: string;
  break_minutes: number;
  notes?: string;
  total_hours?: number;
  created_at: string;
}

interface ClockStatus {
  isClockedIn: boolean;
  isOnBreak: boolean;
  currentEntry?: TimeClockEntry;
}

export const TimeClockScreen: React.FC = () => {
  const { currentUser, currentCashier } = useAuthStore();
  const userId = currentUser?.id || currentCashier?.id;
  const userName = currentUser?.full_name || currentCashier?.id || 'Unknown';

  const [status, setStatus] = useState<ClockStatus>({ isClockedIn: false, isOnBreak: false });
  const [entries, setEntries] = useState<TimeClockEntry[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [shiftSummary, setShiftSummary] = useState<{
    totalHours: number;
    totalBreakMinutes: number;
    netHours: number;
    entriesCount: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // Get clock status
      const clockStatus = await TimeClockService.getClockStatus(userId);
      setStatus({
        isClockedIn: clockStatus.isClockedIn,
        isOnBreak: false, // Simplified - no break tracking
        currentEntry: clockStatus.entry as TimeClockEntry | undefined,
      });
      
      // Get entries for the week
      const weekStart = getWeekStart(selectedDate);
      const weekEnd = getWeekEnd(selectedDate);
      const entriesData = await TimeClockService.getUserEntries(
        userId, 
        weekStart.toISOString(), 
        weekEnd.toISOString()
      );
      setEntries(entriesData as TimeClockEntry[]);

      // Calculate week summary
      const periodHours = await TimeClockService.calculatePeriodHours(
        userId,
        weekStart.toISOString(),
        weekEnd.toISOString()
      );
      
      // Sum up break minutes from all entries
      const totalBreaks = entriesData.reduce((sum, e) => sum + (e.break_minutes || 0), 0);
      
      setShiftSummary({
        totalHours: periodHours.totalHours,
        totalBreakMinutes: totalBreaks,
        netHours: periodHours.totalHours,
        entriesCount: entriesData.length,
      });
    } catch (error) {
      console.error('Failed to load time clock data:', error);
      showNotification('error', 'Failed to load time clock data');
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleClockIn = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await TimeClockService.clockIn(userId, 'default');
      await loadData();
      showNotification('success', 'Clocked in successfully!');
    } catch (error) {
      showNotification('error', 'Failed to clock in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await TimeClockService.clockOut(userId);
      await loadData();
      showNotification('success', 'Clocked out successfully!');
    } catch (error) {
      showNotification('error', 'Failed to clock out');
    } finally {
      setActionLoading(false);
    }
  };

  // Note: Break tracking is simplified - we don't have separate start/end break
  // Users can add break minutes when clocking out

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const goToCurrentWeek = () => {
    setSelectedDate(new Date());
  };

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-slate-900 p-8">
        <User className="w-16 h-16 text-gray-300 dark:text-slate-600 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Not Logged In</h2>
        <p className="text-gray-600 dark:text-slate-400">Please log in to access the time clock.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/20">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Time Clock</h1>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Track your work hours
            </p>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mx-6 mt-4 p-4 rounded-xl flex items-center gap-3 ${
          notification.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Clock In/Out Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
              {/* Current Time Display */}
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Current Time</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white font-mono">
                  {currentTime.toLocaleTimeString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Status Display */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className={`w-3 h-3 rounded-full ${
                  status.isClockedIn 
                    ? status.isOnBreak 
                      ? 'bg-amber-500 animate-pulse' 
                      : 'bg-green-500 animate-pulse'
                    : 'bg-gray-400'
                }`} />
                <span className="text-lg font-medium text-gray-900 dark:text-white">
                  {status.isClockedIn 
                    ? status.isOnBreak 
                      ? 'On Break' 
                      : 'Working'
                    : 'Clocked Out'}
                </span>
              </div>

              {/* User Info */}
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 dark:text-slate-400">Logged in as</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{userName}</p>
              </div>

              {/* Clock In Time (if clocked in) */}
              {status.isClockedIn && status.currentEntry && (
                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 mb-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Clocked in at</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {new Date(status.currentEntry.clock_in).toLocaleTimeString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
                    Duration: {formatDuration(new Date(status.currentEntry.clock_in), new Date())}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                {!status.isClockedIn ? (
                  <button
                    onClick={handleClockIn}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/25 disabled:opacity-50 font-medium text-lg"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Play className="w-6 h-6" />
                        <span>Clock In</span>
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    {!status.isOnBreak ? (
                      <>
                        <button
                          onClick={handleStartBreak}
                          disabled={actionLoading}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 font-medium"
                        >
                          {actionLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <Coffee className="w-5 h-5" />
                              <span>Start Break</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleClockOut}
                          disabled={actionLoading}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all shadow-lg shadow-red-500/25 disabled:opacity-50 font-medium"
                        >
                          {actionLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <Square className="w-5 h-5" />
                              <span>Clock Out</span>
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleEndBreak}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 font-medium text-lg"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <Play className="w-6 h-6" />
                            <span>End Break</span>
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Weekly Summary */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
              {/* Week Navigation */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Weekly Summary
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPreviousWeek}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToCurrentWeek}
                    className="px-3 py-1.5 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors font-medium"
                  >
                    This Week
                  </button>
                  <button
                    onClick={goToNextWeek}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Week Range */}
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-4">
                {getWeekStart(selectedDate).toLocaleDateString()} - {getWeekEnd(selectedDate).toLocaleDateString()}
              </p>

              {/* Stats */}
              {shiftSummary && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
                    <Timer className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {shiftSummary.netHours.toFixed(1)}h
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Net Hours</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
                    <Coffee className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {shiftSummary.totalBreakMinutes}m
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Break Time</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
                    <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {shiftSummary.entriesCount}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Shifts</p>
                  </div>
                </div>
              )}

              {/* Entries List */}
              <div className="space-y-3">
                {entries.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-slate-400">No entries for this week</p>
                  </div>
                ) : (
                  entries.map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        entry.clock_out
                          ? 'bg-gray-200 dark:bg-slate-600'
                          : 'bg-green-100 dark:bg-green-900/30'
                      }`}>
                        <Clock className={`w-5 h-5 ${
                          entry.clock_out
                            ? 'text-gray-500 dark:text-slate-400'
                            : 'text-green-600 dark:text-green-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(entry.clock_in).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {new Date(entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {entry.clock_out 
                            ? new Date(entry.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Working...'
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.clock_out
                            ? formatDuration(new Date(entry.clock_in), new Date(entry.clock_out))
                            : formatDuration(new Date(entry.clock_in), new Date())
                          }
                        </p>
                        {entry.total_break_minutes > 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            {entry.total_break_minutes}m break
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(date: Date): Date {
  const d = getWeekStart(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDuration(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}
