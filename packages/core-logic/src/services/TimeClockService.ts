import { db, LocalTimeClockEntry } from '../database/dexieDb';
import type { TimeClockEntry } from '../types';

export const TimeClockService = {
  /**
   * Clock in a user
   */
  async clockIn(userId: string, workspaceId: string, locationId?: string): Promise<TimeClockEntry> {
    // Check if user already has an open entry
    const openEntry = await db.time_clock_entries
      .where('user_id')
      .equals(userId)
      .filter(e => !e.clock_out)
      .first();

    if (openEntry) {
      throw new Error('User is already clocked in. Please clock out first.');
    }

    const entry: LocalTimeClockEntry = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      user_id: userId,
      location_id: locationId,
      clock_in: new Date().toISOString(),
      break_minutes: 0,
      overtime_hours: 0,
      is_approved: false,
      created_at: new Date().toISOString(),
      _synced: false,
      _dirty: true,
    };

    await db.time_clock_entries.add(entry);
    return entry;
  },

  /**
   * Clock out a user
   */
  async clockOut(userId: string, breakMinutes: number = 0, notes?: string): Promise<TimeClockEntry> {
    const entry = await db.time_clock_entries
      .where('user_id')
      .equals(userId)
      .filter(e => !e.clock_out)
      .first();

    if (!entry) {
      throw new Error('No open clock entry found. Please clock in first.');
    }

    const clockOut = new Date();
    const clockIn = new Date(entry.clock_in);
    
    // Calculate total hours worked (excluding breaks)
    const totalMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60) - breakMinutes;
    const totalHours = Math.max(0, totalMinutes / 60);
    
    // Calculate overtime (hours over 8)
    const regularHours = 8;
    const overtimeHours = Math.max(0, totalHours - regularHours);

    const updates: Partial<LocalTimeClockEntry> = {
      clock_out: clockOut.toISOString(),
      break_minutes: breakMinutes,
      total_hours: Math.round(totalHours * 100) / 100,
      overtime_hours: Math.round(overtimeHours * 100) / 100,
      notes,
      _dirty: true,
    };

    await db.time_clock_entries.update(entry.id, updates);

    return { ...entry, ...updates } as TimeClockEntry;
  },

  /**
   * Get current clock status for a user
   */
  async getClockStatus(userId: string): Promise<{ isClockedIn: boolean; entry?: TimeClockEntry }> {
    const entry = await db.time_clock_entries
      .where('user_id')
      .equals(userId)
      .filter(e => !e.clock_out)
      .first();

    return {
      isClockedIn: !!entry,
      entry: entry || undefined,
    };
  },

  /**
   * Get time entries for a user within a date range
   */
  async getUserEntries(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<TimeClockEntry[]> {
    return await db.time_clock_entries
      .where('user_id')
      .equals(userId)
      .filter(e => e.clock_in >= startDate && e.clock_in <= endDate)
      .toArray();
  },

  /**
   * Get all entries for a workspace within a date range
   */
  async getWorkspaceEntries(
    workspaceId: string,
    startDate: string,
    endDate: string,
    options?: {
      userId?: string;
      locationId?: string;
      isApproved?: boolean;
    }
  ): Promise<TimeClockEntry[]> {
    let entries = await db.time_clock_entries
      .where('workspace_id')
      .equals(workspaceId)
      .filter(e => e.clock_in >= startDate && e.clock_in <= endDate)
      .toArray();

    if (options?.userId) {
      entries = entries.filter(e => e.user_id === options.userId);
    }
    if (options?.locationId) {
      entries = entries.filter(e => e.location_id === options.locationId);
    }
    if (options?.isApproved !== undefined) {
      entries = entries.filter(e => e.is_approved === options.isApproved);
    }

    // Sort by clock_in descending
    entries.sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime());

    return entries;
  },

  /**
   * Approve a time clock entry
   */
  async approveEntry(entryId: string, approvedBy: string): Promise<void> {
    await db.time_clock_entries.update(entryId, {
      is_approved: true,
      approved_by: approvedBy,
      _dirty: true,
    });
  },

  /**
   * Update a time clock entry (for corrections)
   */
  async updateEntry(
    entryId: string,
    updates: {
      clockIn?: string;
      clockOut?: string;
      breakMinutes?: number;
      notes?: string;
    }
  ): Promise<void> {
    const entry = await db.time_clock_entries.get(entryId);
    if (!entry) throw new Error('Entry not found');

    const clockIn = updates.clockIn ? new Date(updates.clockIn) : new Date(entry.clock_in);
    const clockOut = updates.clockOut ? new Date(updates.clockOut) : entry.clock_out ? new Date(entry.clock_out) : null;
    const breakMinutes = updates.breakMinutes ?? entry.break_minutes;

    let totalHours = entry.total_hours;
    let overtimeHours = entry.overtime_hours;

    if (clockOut) {
      const totalMinutes = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60) - breakMinutes;
      totalHours = Math.max(0, totalMinutes / 60);
      overtimeHours = Math.max(0, totalHours - 8);
    }

    await db.time_clock_entries.update(entryId, {
      clock_in: clockIn.toISOString(),
      clock_out: clockOut?.toISOString(),
      break_minutes: breakMinutes,
      total_hours: totalHours ? Math.round(totalHours * 100) / 100 : undefined,
      overtime_hours: Math.round(overtimeHours * 100) / 100,
      notes: updates.notes ?? entry.notes,
      is_approved: false, // Reset approval when modified
      _dirty: true,
    });
  },

  /**
   * Calculate total hours for a period
   */
  async calculatePeriodHours(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    regularHours: number;
    overtimeHours: number;
    totalHours: number;
    entries: number;
  }> {
    const entries = await this.getUserEntries(userId, startDate, endDate);
    
    let regularHours = 0;
    let overtimeHours = 0;

    for (const entry of entries) {
      if (entry.total_hours) {
        const regular = Math.min(entry.total_hours, 8);
        regularHours += regular;
        overtimeHours += entry.overtime_hours || 0;
      }
    }

    return {
      regularHours: Math.round(regularHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      totalHours: Math.round((regularHours + overtimeHours) * 100) / 100,
      entries: entries.length,
    };
  },

  /**
   * Get weekly timesheet
   */
  async getWeeklyTimesheet(
    userId: string,
    weekStartDate: string // Monday of the week
  ): Promise<{
    days: Array<{
      date: string;
      dayName: string;
      entries: TimeClockEntry[];
      totalHours: number;
    }>;
    weeklyTotals: {
      regularHours: number;
      overtimeHours: number;
      totalHours: number;
    };
  }> {
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const entries = await this.getUserEntries(
      userId,
      weekStart.toISOString(),
      weekEnd.toISOString()
    );

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const days = [];
    let totalRegular = 0;
    let totalOvertime = 0;

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayEntries = entries.filter(e => e.clock_in.startsWith(dateStr));
      const dayHours = dayEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

      days.push({
        date: dateStr,
        dayName: dayNames[date.getDay()],
        entries: dayEntries,
        totalHours: Math.round(dayHours * 100) / 100,
      });

      // Calculate daily overtime
      if (dayHours > 8) {
        totalRegular += 8;
        totalOvertime += dayHours - 8;
      } else {
        totalRegular += dayHours;
      }
    }

    return {
      days,
      weeklyTotals: {
        regularHours: Math.round(totalRegular * 100) / 100,
        overtimeHours: Math.round(totalOvertime * 100) / 100,
        totalHours: Math.round((totalRegular + totalOvertime) * 100) / 100,
      },
    };
  },
};
