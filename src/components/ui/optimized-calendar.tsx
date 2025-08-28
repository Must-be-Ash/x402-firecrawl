'use client';

import { useState, useCallback, memo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore } from 'date-fns';
import { useNews, useNewsDate } from '@/lib/context/news-context';
import { useDebounce, useFocusManagement, usePerformanceMonitoring } from '@/lib/hooks/performance-hooks';

interface OptimizedCalendarProps {
  onDateSelect?: (date: Date) => void;
  maxDate?: Date;
  className?: string;
}

const OptimizedCalendar = memo(function OptimizedCalendar({
  onDateSelect,
  maxDate = new Date(),
  className = '',
}: OptimizedCalendarProps) {
  const { isLoading, fetchNews } = useNews();
  const { selectedDate, availableDates, isDateAvailable } = useNewsDate();
  const { setFocusElement, handleKeyDown } = useFocusManagement();
  usePerformanceMonitoring('OptimizedCalendar');

  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  
  // Debounce month changes to prevent excessive re-renders
  const debouncedMonth = useDebounce(currentMonth, 150);

  const monthStart = startOfMonth(debouncedMonth);
  const monthEnd = endOfMonth(debouncedMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Memoized navigation handlers
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    if (isBefore(nextMonth, maxDate) || format(nextMonth, 'yyyy-MM') === format(maxDate, 'yyyy-MM')) {
      setCurrentMonth(nextMonth);
    }
  }, [currentMonth, maxDate]);

  // Optimized date checking
  const isDateDisabled = useCallback((date: Date) => {
    return !isBefore(date, maxDate) && !isToday(date);
  }, [maxDate]);

  // Enhanced date selection with prefetching
  const handleDateClick = useCallback(async (date: Date) => {
    if (isDateDisabled(date) || isLoading) return;
    
    // Optimistic update - show loading immediately
    if (onDateSelect) {
      onDateSelect(date);
    }

    // Prefetch news if not available
    if (!isDateAvailable(date)) {
      try {
        await fetchNews(date);
      } catch (error) {
        console.warn('Failed to prefetch news for date:', error);
      }
    }
  }, [isDateDisabled, isLoading, onDateSelect, isDateAvailable, fetchNews]);

  // Keyboard navigation
  const handleDateKeyDown = useCallback((e: React.KeyboardEvent, date: Date) => {
    handleKeyDown(e.nativeEvent, 
      () => handleDateClick(date),
      () => setFocusElement(null)
    );
  }, [handleKeyDown, handleDateClick, setFocusElement]);

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border border-gray-200 ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          disabled={isLoading}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h2 className="text-xl font-semibold text-gray-900">
          {format(debouncedMonth, 'MMMM yyyy')}
        </h2>

        <button
          onClick={goToNextMonth}
          disabled={isLoading || format(currentMonth, 'yyyy-MM') === format(maxDate, 'yyyy-MM')}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((date) => {
          const isCurrentMonth = isSameMonth(date, debouncedMonth);
          const isTodayDate = isToday(date);
          const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
          const hasAvailableNews = isDateAvailable(date);
          const isDisabled = isDateDisabled(date);
          const dateKey = format(date, 'yyyy-MM-dd');

          return (
            <button
              key={dateKey}
              onClick={() => handleDateClick(date)}
              onKeyDown={(e) => handleDateKeyDown(e, date)}
              disabled={isDisabled || isLoading}
              ref={(el) => {
                if (isSelected) {
                  setFocusElement(el);
                }
              }}
              className={`
                p-2 text-sm rounded-md transition-all duration-200 relative
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                ${!isCurrentMonth ? 'text-gray-300 cursor-default' : ''}
                ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100 hover:scale-105'}
                ${isTodayDate ? 'ring-2 ring-blue-400' : ''}
                ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md' : 'text-gray-900'}
                ${hasAvailableNews && !isSelected ? 'bg-green-50 text-green-800 hover:bg-green-100' : ''}
                ${isLoading ? 'opacity-50 cursor-wait' : ''}
              `}
              title={
                hasAvailableNews 
                  ? `News available for ${format(date, 'MMMM d, yyyy')}`
                  : format(date, 'MMMM d, yyyy')
              }
              aria-label={`${format(date, 'MMMM d, yyyy')}${hasAvailableNews ? ' - News available' : ''}${isSelected ? ' - Selected' : ''}`}
              data-selected={isSelected}
            >
              {format(date, 'd')}
              
              {/* Indicator for available news */}
              {hasAvailableNews && !isSelected && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full"></div>
              )}
              
              {/* Loading indicator for current date */}
              {isSelected && isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-blue-600 bg-opacity-75 rounded-md">
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Enhanced Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
            <span>News available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 border-2 border-blue-400 rounded"></div>
            <span>Today</span>
          </div>
          {isLoading && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading...</span>
            </div>
          )}
        </div>
        
        {/* Quick stats */}
        <div className="mt-2 text-xs text-gray-500">
          {availableDates.length > 0 && (
            <span>{availableDates.length} days with news available</span>
          )}
        </div>
      </div>
    </div>
  );
});

// Skeleton loading state with better animation
export function OptimizedCalendarSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border border-gray-200 ${className}`}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
      </div>

      {/* Days header skeleton */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array(7).fill(0).map((_, i) => (
          <div key={i} className="p-2">
            <div className="w-8 h-4 bg-gray-200 rounded mx-auto animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Calendar days skeleton */}
      <div className="grid grid-cols-7 gap-1">
        {Array(35).fill(0).map((_, i) => (
          <div key={i} className="p-2">
            <div 
              className={`w-8 h-8 rounded mx-auto animate-pulse ${
                Math.random() > 0.7 ? 'bg-green-200' : 'bg-gray-200'
              }`}
              style={{ animationDelay: `${i * 20}ms` }}
            ></div>
          </div>
        ))}
      </div>

      {/* Legend skeleton */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex gap-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OptimizedCalendar;