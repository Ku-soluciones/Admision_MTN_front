import { CHILEAN_CONFIG } from '../services/config';

/**
 * Timezone utility functions for consistent date handling across the application
 * Uses America/Santiago timezone as configured in CHILEAN_CONFIG
 */

export const SANTIAGO_TIMEZONE = CHILEAN_CONFIG.TIMEZONE; // 'America/Santiago'

/**
 * Creates a Date object in Santiago timezone from a date string
 * Prevents timezone issues when parsing date strings
 */
export const createSantiagoDate = (dateString?: string): Date => {
  if (!dateString) {
    return new Date();
  }

  // If it's a YYYY-MM-DD format, parse it as local date to avoid timezone shifts
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // For ISO strings or other formats, parse normally
  return new Date(dateString);
};

/**
 * Formats a date to Santiago timezone
 */
export const formatSantiagoDate = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const dateObj = typeof date === 'string' ? createSantiagoDate(date) : date;

  return dateObj.toLocaleDateString(CHILEAN_CONFIG.LOCALE, {
    timeZone: SANTIAGO_TIMEZONE,
    ...options
  });
};

/**
 * Formats a time to Santiago timezone
 */
export const formatSantiagoTime = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const dateObj = typeof date === 'string' ? createSantiagoDate(date) : date;

  return dateObj.toLocaleTimeString(CHILEAN_CONFIG.LOCALE, {
    timeZone: SANTIAGO_TIMEZONE,
    hour12: false, // Use 24-hour format by default
    ...options
  });
};

/**
 * Formats a date and time to Santiago timezone
 */
export const formatSantiagoDateTime = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const dateObj = typeof date === 'string' ? createSantiagoDate(date) : date;

  return dateObj.toLocaleString(CHILEAN_CONFIG.LOCALE, {
    timeZone: SANTIAGO_TIMEZONE,
    hour12: false,
    ...options
  });
};

/**
 * Gets current date and time in Santiago timezone
 */
export const getNowInSantiago = (): Date => {
  return new Date();
};

/**
 * Converts a date to Santiago timezone and formats as ISO string
 */
export const toSantiagoISOString = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? createSantiagoDate(date) : date;

  // Get the date components in Santiago timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SANTIAGO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(dateObj);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const second = parts.find(p => p.type === 'second')?.value;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
};

/**
 * Gets the current date in YYYY-MM-DD format in Santiago timezone
 */
export const getTodayInSantiago = (): string => {
  const today = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SANTIAGO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  return formatter.format(today);
};

/**
 * Checks if a date string is in the past (Santiago timezone)
 */
export const isDateInPast = (dateString: string): boolean => {
  const today = getTodayInSantiago();
  return dateString < today;
};

/**
 * Checks if a date string is today (Santiago timezone)
 */
export const isToday = (dateString: string): boolean => {
  const today = getTodayInSantiago();
  return dateString === today;
};

/**
 * Gets the day of week for a date in Santiago timezone
 * Returns 0 for Sunday, 1 for Monday, etc.
 */
export const getSantiagoDayOfWeek = (dateString: string): number => {
  const date = createSantiagoDate(dateString);
  return date.getDay();
};

/**
 * Gets the day name for a date in Santiago timezone
 */
export const getSantiagoDayName = (dateString: string): string => {
  const date = createSantiagoDate(dateString);
  return date.toLocaleDateString(CHILEAN_CONFIG.LOCALE, {
    timeZone: SANTIAGO_TIMEZONE,
    weekday: 'long'
  });
};

/**
 * Adds days to a date and returns in Santiago timezone
 */
export const addDaysInSantiago = (dateString: string, days: number): string => {
  const date = createSantiagoDate(dateString);
  date.setDate(date.getDate() + days);

  return date.toISOString().split('T')[0];
};

/**
 * Default date format options for Chilean locale
 */
export const CHILE_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: SANTIAGO_TIMEZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long'
};

/**
 * Default time format options for Chilean locale
 */
export const CHILE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: SANTIAGO_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
};

/**
 * Default datetime format options for Chilean locale
 */
export const CHILE_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: SANTIAGO_TIMEZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
};