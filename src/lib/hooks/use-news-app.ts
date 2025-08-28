import { useCallback, useEffect, useMemo } from 'react';
import { useNews, useNewsDate, useNewsError } from '@/lib/context/news-context';
import { useNewsCache } from '@/lib/services/cache-service';
import { useDebounce, useThrottle, useOptimizedState } from './performance-hooks';
import { formatDateForAPI } from '@/lib/utils/date-utils';

/**
 * Comprehensive hook that combines all news application logic
 * This is the main hook that components should use for news functionality
 */
export function useNewsApp() {
  const newsContext = useNews();
  const dateContext = useNewsDate();
  const errorContext = useNewsError();
  const cacheService = useNewsCache();

  const {
    articles,
    isLoading,
    isCached,
    timezone,
    lastFetched,
    fetchNews: contextFetchNews,
    setTimezone,
  } = newsContext;

  const {
    selectedDate,
    selectDate,
    availableDates,
    isDateAvailable,
    getNextAvailableDate,
    getPreviousAvailableDate,
  } = dateContext;

  const {
    error,
    errorMessage,
    canRetry,
    retry,
    clearError,
  } = errorContext;

  // Optimized state for UI interactions
  const [isPreloading, setIsPreloading] = useOptimizedState(false);

  // Debounce date selection to prevent excessive API calls
  const debouncedSelectedDate = useDebounce(selectedDate, 300);

  // Throttled fetch function to prevent spam
  const throttledFetch = useThrottle(contextFetchNews as (...args: unknown[]) => unknown, 1000);

  // Enhanced fetch with caching
  const fetchNews = useCallback(async (date: Date, force = false) => {
    if (isLoading && !force) return;

    try {
      // First try cache
      const cached = await cacheService.getCachedNews(date, timezone);
      if (cached && !force) {
        // Cache hit - we'll let context handle this
        return;
      }

      // Cache miss or force refresh - fetch from API
      await (throttledFetch as (date: Date, force?: boolean) => Promise<void>)(date, force);
    } catch (error) {
      console.error('Failed to fetch news:', error);
    }
  }, [isLoading, cacheService, timezone, throttledFetch]);

  // Smart date selection with preloading
  const selectDateSmart = useCallback(async (date: Date) => {
    selectDate(date);
    clearError(); // Clear any previous errors

    // Preload nearby dates in background
    setIsPreloading(true);
    try {
      const promises = [];
      
      // Preload previous day
      const prevDay = new Date(date);
      prevDay.setDate(date.getDate() - 1);
      if (!isDateAvailable(prevDay)) {
        promises.push(cacheService.preloadNearbyDates(prevDay, timezone));
      }

      // Preload next day
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      if (!isDateAvailable(nextDay) && nextDay <= new Date()) {
        promises.push(cacheService.preloadNearbyDates(nextDay, timezone));
      }

      await Promise.allSettled(promises);
    } catch (error) {
      console.warn('Preloading failed:', error);
    } finally {
      setIsPreloading(false);
    }
  }, [selectDate, clearError, isDateAvailable, cacheService, timezone, setIsPreloading]);

  // Navigate to next available date
  const goToNextAvailableDate = useCallback(() => {
    const nextDate = getNextAvailableDate();
    if (nextDate) {
      selectDateSmart(nextDate);
    }
  }, [getNextAvailableDate, selectDateSmart]);

  // Navigate to previous available date  
  const goToPreviousAvailableDate = useCallback(() => {
    const prevDate = getPreviousAvailableDate();
    if (prevDate) {
      selectDateSmart(prevDate);
    }
  }, [getPreviousAvailableDate, selectDateSmart]);

  // Go to today
  const goToToday = useCallback(() => {
    selectDateSmart(new Date());
  }, [selectDateSmart]);

  // Enhanced retry with exponential backoff
  const retryWithBackoff = useCallback(async () => {
    if (!canRetry) {
      // Clear cache and force refresh if max retries reached
      cacheService.clearDateCache(selectedDate, timezone);
      await fetchNews(selectedDate, true);
      return;
    }

    await retry();
  }, [canRetry, retry, cacheService, selectedDate, timezone, fetchNews]);

  // Clear all data and refresh
  const clearAndRefresh = useCallback(async () => {
    cacheService.clearAllCache();
    clearError();
    await fetchNews(selectedDate, true);
  }, [cacheService, clearError, fetchNews, selectedDate]);

  // Auto-fetch when debounced date changes
  useEffect(() => {
    if (debouncedSelectedDate) {
      fetchNews(debouncedSelectedDate);
    }
  }, [debouncedSelectedDate, timezone, fetchNews]);

  // Memoized computed values
  const computedValues = useMemo(() => {
    const hasNewsToday = isDateAvailable(new Date());
    const isToday = formatDateForAPI(selectedDate) === formatDateForAPI(new Date());
    const totalAvailableDates = availableDates.length;
    const currentDateIndex = availableDates.findIndex(
      date => formatDateForAPI(date) === formatDateForAPI(selectedDate)
    );
    
    return {
      hasNewsToday,
      isToday,
      totalAvailableDates,
      currentDateIndex,
      hasNext: currentDateIndex > 0,
      hasPrevious: currentDateIndex < availableDates.length - 1,
      cacheStats: cacheService.getCacheStats(),
    };
  }, [availableDates, selectedDate, isDateAvailable, cacheService]);

  // Return comprehensive API
  return {
    // State
    articles,
    selectedDate,
    timezone,
    availableDates,
    isLoading,
    isPreloading,
    isCached,
    error,
    errorMessage,
    lastFetched,
    
    // Computed values
    ...computedValues,
    
    // Actions
    fetchNews,
    selectDate: selectDateSmart,
    setTimezone,
    
    // Navigation
    goToNextAvailableDate,
    goToPreviousAvailableDate,
    goToToday,
    
    // Error handling
    retry: retryWithBackoff,
    clearError,
    clearAndRefresh,
    canRetry,
    
    // Utilities
    isDateAvailable,
    formatDateForDisplay: (date: Date) => date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric'
    }),
  };
}

/**
 * Hook for calendar-specific functionality
 */
export function useNewsCalendar() {
  const { 
    selectedDate,
    availableDates,
    isDateAvailable,
    selectDate,
    isLoading,
  } = useNewsApp();

  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useOptimizedState(selectedDate);

  const calendarData = useMemo(() => {
    return availableDates.map(date => ({
      date,
      hasNews: true,
      isSelected: formatDateForAPI(date) === formatDateForAPI(selectedDate),
      isToday: formatDateForAPI(date) === formatDateForAPI(new Date()),
    }));
  }, [availableDates, selectedDate]);

  return {
    selectedDate,
    currentMonth,
    calendarData,
    isLoading,
    setCurrentMonth,
    selectDate,
    isDateAvailable,
  };
}

/**
 * Hook for news grid functionality
 */
export function useNewsGrid() {
  const {
    articles,
    isLoading,
    error,
    errorMessage,
    isCached,
    retry,
    clearError,
  } = useNewsApp();

  const gridData = useMemo(() => ({
    articles: articles || [],
    hasArticles: articles && articles.length > 0,
    articleCount: articles?.length || 0,
    isEmpty: !articles || articles.length === 0,
  }), [articles]);

  return {
    ...gridData,
    isLoading,
    error,
    errorMessage,
    isCached,
    retry,
    clearError,
  };
}