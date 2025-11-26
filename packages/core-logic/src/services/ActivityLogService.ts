// ActivityLogService.ts - Activity logging for audit trail
import { db } from '../database/dexieDb';

// Activity log interface that the UI expects
export interface ActivityLog {
  id: string;
  user_id: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
  before_value?: any;
  after_value?: any;
  ip_address?: string;
  device_info?: string;
  created_at: string;
}

export interface ActivityLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export class ActivityLogService {
  /**
   * Log an activity
   */
  async logActivity(data: {
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: string;
    beforeValue?: any;
    afterValue?: any;
  }): Promise<ActivityLog> {
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      user_id: data.userId,
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId,
      details: data.details,
      before_value: data.beforeValue,
      after_value: data.afterValue,
      device_info: typeof navigator !== 'undefined' ? navigator.userAgent : 'desktop',
      created_at: new Date().toISOString()
    };

    // Store in activity_logs table if it exists
    try {
      if ((db as any).activity_logs) {
        await (db as any).activity_logs.add(log);
      } else {
        // Fallback: store in localStorage for now
        const logs = JSON.parse(localStorage.getItem('activity_logs') || '[]');
        logs.push(log);
        // Keep only last 1000 logs
        if (logs.length > 1000) {
          logs.splice(0, logs.length - 1000);
        }
        localStorage.setItem('activity_logs', JSON.stringify(logs));
      }
    } catch (error) {
      console.warn('Failed to save activity log:', error);
    }

    return log;
  }

  /**
   * Get activity logs with filters
   */
  async getActivityLogs(filters: ActivityLogFilters = {}): Promise<ActivityLog[]> {
    try {
      // Try database first
      if ((db as any).activity_logs) {
        let query = (db as any).activity_logs.orderBy('created_at').reverse();
        
        const logs = await query.toArray();
        return this.filterLogs(logs, filters);
      }
      
      // Fallback: localStorage
      const logs = JSON.parse(localStorage.getItem('activity_logs') || '[]');
      return this.filterLogs(logs.reverse(), filters);
    } catch (error) {
      console.error('Failed to get activity logs:', error);
      return [];
    }
  }

  private filterLogs(logs: ActivityLog[], filters: ActivityLogFilters): ActivityLog[] {
    let filtered = logs;

    if (filters.userId) {
      filtered = filtered.filter(l => l.user_id === filters.userId);
    }

    if (filters.action) {
      filtered = filtered.filter(l => l.action === filters.action);
    }

    if (filters.entityType) {
      filtered = filtered.filter(l => l.entity_type === filters.entityType);
    }

    if (filters.startDate) {
      filtered = filtered.filter(l => l.created_at >= filters.startDate!);
    }

    if (filters.endDate) {
      filtered = filtered.filter(l => l.created_at <= filters.endDate!);
    }

    const offset = filters.offset || 0;
    const limit = filters.limit || 50;

    return filtered.slice(offset, offset + limit);
  }

  /**
   * Get unique action types for filter dropdown
   */
  async getActionTypes(): Promise<string[]> {
    const logs = await this.getActivityLogs({ limit: 1000 });
    const actions = new Set(logs.map(l => l.action));
    return Array.from(actions).sort();
  }

  /**
   * Get unique entity types for filter dropdown
   */
  async getEntityTypes(): Promise<string[]> {
    const logs = await this.getActivityLogs({ limit: 1000 });
    const types = new Set(logs.map(l => l.entity_type));
    return Array.from(types).sort();
  }

  /**
   * Clear old activity logs (keep last N days)
   */
  async clearOldLogs(keepDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);
    const cutoffISO = cutoffDate.toISOString();

    try {
      if ((db as any).activity_logs) {
        const oldLogs = await (db as any).activity_logs
          .where('created_at')
          .below(cutoffISO)
          .toArray();
        
        const ids = oldLogs.map((l: ActivityLog) => l.id);
        await (db as any).activity_logs.bulkDelete(ids);
        return ids.length;
      }

      // Fallback: localStorage
      const logs = JSON.parse(localStorage.getItem('activity_logs') || '[]');
      const filtered = logs.filter((l: ActivityLog) => l.created_at >= cutoffISO);
      const removed = logs.length - filtered.length;
      localStorage.setItem('activity_logs', JSON.stringify(filtered));
      return removed;
    } catch (error) {
      console.error('Failed to clear old logs:', error);
      return 0;
    }
  }

  /**
   * Export logs to JSON
   */
  async exportLogs(filters: ActivityLogFilters = {}): Promise<string> {
    const logs = await this.getActivityLogs({ ...filters, limit: 10000 });
    return JSON.stringify(logs, null, 2);
  }

  // Singleton
  private static instance: ActivityLogService;
  static getInstance(): ActivityLogService {
    if (!ActivityLogService.instance) {
      ActivityLogService.instance = new ActivityLogService();
    }
    return ActivityLogService.instance;
  }
}

// Helper function for quick logging
export async function logActivity(
  action: string,
  entityType: string,
  options: {
    userId?: string;
    entityId?: string;
    details?: string;
    beforeValue?: any;
    afterValue?: any;
  } = {}
): Promise<void> {
  const service = ActivityLogService.getInstance();
  await service.logActivity({
    userId: options.userId || 'system',
    action,
    entityType,
    entityId: options.entityId,
    details: options.details,
    beforeValue: options.beforeValue,
    afterValue: options.afterValue
  });
}
