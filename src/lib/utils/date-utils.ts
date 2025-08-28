import { format, isValid, parseISO, addDays, subDays } from 'date-fns';

export function formatDateForAPI(date: Date): string {
  if (!isValid(date)) {
    throw new Error('Invalid date provided');
  }
  return format(date, 'yyyy-MM-dd');
}

export function formatDisplayDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) {
    throw new Error('Invalid date provided');
  }
  return format(dateObj, 'MMMM d, yyyy');
}

export function getLocalUserDate(timezone?: string): Date {
  const now = new Date();
  if (timezone) {
    try {
      // Convert to user's timezone
      const userTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
      return userTime;
    } catch {
      console.warn('Invalid timezone provided, using UTC:', timezone);
    }
  }
  return now;
}

export function isValidNewsDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) {
    return false;
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inputDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  
  // Not in the future and not more than 1 year old
  const oneYearAgo = subDays(today, 365);
  return inputDate <= today && inputDate >= oneYearAgo;
}

export function validateDateFormat(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }
  
  const date = parseISO(dateString);
  return isValid(date) && formatDateForAPI(date) === dateString;
}

export function getTimezoneFromRequest(request: Request): string {
  // Try to get timezone from headers
  const timezoneHeader = request.headers.get('x-timezone');
  if (timezoneHeader) {
    return timezoneHeader;
  }
  
  // Try to get from user-agent or other headers
  const userAgent = request.headers.get('user-agent');
  if (userAgent) {
    // This is a basic implementation - in production you might use a geolocation service
    // For now, return UTC as default
  }
  
  return 'UTC';
}

export function getTodayInTimezone(timezone: string = 'UTC'): string {
  const now = new Date();
  try {
    const userTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    return formatDateForAPI(userTime);
  } catch {
    console.warn('Invalid timezone, using UTC:', timezone);
    return formatDateForAPI(now);
  }
}

export function generateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(formatDateForAPI(currentDate));
    currentDate = addDays(currentDate, 1);
  }
  
  return dates;
}