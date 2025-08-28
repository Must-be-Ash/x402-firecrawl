'use client';

import { useState } from 'react';
import { format, subDays, addDays, isToday, isSameDay } from 'date-fns';

interface DateSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  maxDate?: Date;
  availableDates?: Date[];
  isLoading?: boolean;
}

export default function DateSelector({
  selectedDate,
  onDateSelect,
  maxDate = new Date(),
  availableDates = [],
  isLoading = false,
}: DateSelectorProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const goToPreviousDay = () => {
    const previousDay = subDays(selectedDate, 1);
    if (previousDay <= maxDate) {
      onDateSelect(previousDay);
    }
  };

  const goToNextDay = () => {
    const nextDay = addDays(selectedDate, 1);
    if (nextDay <= maxDate) {
      onDateSelect(nextDay);
    }
  };

  const goToToday = () => {
    onDateSelect(new Date());
  };

  const isDateAvailable = (date: Date) => {
    return availableDates.some(availableDate => 
      isSameDay(availableDate, date)
    );
  };

  const canGoNext = () => {
    const nextDay = addDays(selectedDate, 1);
    return nextDay <= maxDate;
  };

  const canGoPrev = () => {
    // Allow going back for reasonable amount (e.g., 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30);
    return selectedDate > thirtyDaysAgo;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Main Date Display */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousDay}
          disabled={!canGoPrev() || isLoading}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous day"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            disabled={isLoading}
          >
            {format(selectedDate, 'EEEE, MMMM d')}
          </button>
          <div className="text-sm text-gray-500">
            {format(selectedDate, 'yyyy')}
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center justify-center gap-2 mt-1">
            {isToday(selectedDate) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Today
              </span>
            )}
            
            {isDateAvailable(selectedDate) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Available
              </span>
            )}

            {isLoading && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Loading
              </span>
            )}
          </div>
        </div>

        <button
          onClick={goToNextDay}
          disabled={!canGoNext() || isLoading}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next day"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-center gap-2">
        {!isToday(selectedDate) && (
          <button
            onClick={goToToday}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Today
          </button>
        )}

        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {showDatePicker ? 'Hide' : 'Calendar'}
        </button>
      </div>

      {/* Recent dates */}
      {availableDates.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-medium text-gray-600 mb-2">Recent news</h4>
          <div className="flex flex-wrap gap-1">
            {availableDates.slice(0, 5).map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => onDateSelect(date)}
                  disabled={isLoading}
                  className={`
                    px-2 py-1 text-xs rounded transition-colors
                    ${isSelected 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {format(date, 'MMM d')}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar toggle hint */}
      {showDatePicker && (
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            Use the full calendar in the sidebar for more date options
          </p>
        </div>
      )}
    </div>
  );
}

// Compact version for mobile or constrained spaces
export function CompactDateSelector({
  selectedDate,
  onDateSelect,
  maxDate = new Date(),
  isLoading = false,
}: Omit<DateSelectorProps, 'availableDates'>) {
  const goToPreviousDay = () => {
    const previousDay = subDays(selectedDate, 1);
    if (previousDay <= maxDate) {
      onDateSelect(previousDay);
    }
  };

  const goToNextDay = () => {
    const nextDay = addDays(selectedDate, 1);
    if (nextDay <= maxDate) {
      onDateSelect(nextDay);
    }
  };

  const canGoNext = () => {
    const nextDay = addDays(selectedDate, 1);
    return nextDay <= maxDate;
  };

  const canGoPrev = () => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    return selectedDate > thirtyDaysAgo;
  };

  return (
    <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2">
      <button
        onClick={goToPreviousDay}
        disabled={!canGoPrev() || isLoading}
        className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Previous day"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="text-center">
        <div className="font-medium text-sm text-gray-900">
          {format(selectedDate, 'MMM d, yyyy')}
        </div>
        {isToday(selectedDate) && (
          <div className="text-xs text-blue-600 font-medium">Today</div>
        )}
      </div>

      <button
        onClick={goToNextDay}
        disabled={!canGoNext() || isLoading}
        className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Next day"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// Loading skeleton for DateSelector
export function DateSelectorSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
        <div className="text-center">
          <div className="w-32 h-6 bg-gray-200 rounded mb-1"></div>
          <div className="w-16 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
      </div>
      
      <div className="flex items-center justify-center gap-2">
        <div className="w-16 h-6 bg-gray-200 rounded"></div>
        <div className="w-20 h-6 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}