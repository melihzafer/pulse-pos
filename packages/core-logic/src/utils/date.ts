import { format, formatDistance, formatRelative, parseISO } from 'date-fns';

/**
 * Format a date to a readable string
 * @param date - Date string or Date object
 * @param formatStr - Format string (default: 'PPpp')
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, formatStr: string = 'PPpp'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format a date relative to now (e.g., "2 hours ago")
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistance(dateObj, new Date(), { addSuffix: true });
}

/**
 * Format a date relative to a base date
 * @param date - Date string or Date object
 * @param baseDate - Base date for comparison
 * @returns Formatted relative string
 */
export function formatRelativeToDate(date: string | Date, baseDate: Date = new Date()): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatRelative(dateObj, baseDate);
}

/**
 * Get current ISO timestamp
 * @returns ISO string of current date/time
 */
export function now(): string {
  return new Date().toISOString();
}
