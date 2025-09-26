'use client';

import { useEffect } from 'react';
import { useNews, useNewsDate, useNewsError } from '@/lib/context/news-context';
import { useNewsCache } from '@/lib/services/cache-service';
import NewsGrid from './news-grid';
import Calendar, { CalendarSkeleton } from '@/components/ui/calendar';
// import LoadingSpinner from '@/components/ui/loading-spinner';
import ErrorBoundary from '@/components/ui/error-boundary';

interface NewsFeedProps {
  date: Date;
  timezone: string;
  onDateChange: (date: Date) => void;
}

export default function NewsFeed({ date, timezone, onDateChange }: NewsFeedProps) {
  const { 
    articles, 
    isLoading, 
    isCached, 
    fetchNews,
    setTimezone,
    // refreshAvailableDates 
  } = useNews();
  
  const { 
    selectedDate,
    selectDate, 
    availableDates,
    // isDateAvailable 
  } = useNewsDate();
  
  const { 
    error, 
    errorMessage, 
    canRetry, 
    retry, 
    clearError 
  } = useNewsError();

  const { preloadNearbyDates } = useNewsCache();

  // Sync external props with internal state
  useEffect(() => {
    if (date.getTime() !== selectedDate.getTime()) {
      selectDate(date);
    }
  }, [date, selectedDate, selectDate]);

  useEffect(() => {
    setTimezone(timezone);
  }, [timezone, setTimezone]);

  // Preload nearby dates for better UX
  useEffect(() => {
    if (selectedDate && !isLoading) {
      preloadNearbyDates(selectedDate, timezone).catch(console.warn);
    }
  }, [selectedDate, timezone, isLoading, preloadNearbyDates]);

  const handleDateSelect = (selectedDate: Date) => {
    selectDate(selectedDate);
    onDateChange(selectedDate);
    clearError(); // Clear any previous errors when changing dates
  };

  const handleRetry = async () => {
    if (canRetry) {
      await retry();
    } else {
      // If max retries reached, force refresh
      await fetchNews(selectedDate, true);
    }
  };

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Calendar Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Select Date
            </h2>
            {isLoading && availableDates.length === 0 ? (
              <CalendarSkeleton />
            ) : (
              <Calendar
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                availableDates={availableDates}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Daily News
                </h1>
                <p className="text-gray-600 mt-1">
                  {selectedDate.toLocaleDateString(undefined, { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              
              {/* Status indicators */}
              <div className="flex items-center gap-2">
                {isCached && !isLoading && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Cached
                  </span>
                )}
                
              </div>
            </div>

            {/* Quick actions */}
            {error && (
              <div className="mt-4">
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {errorMessage || 'Something went wrong'}
                      </h3>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleRetry}
                    disabled={!canRetry}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {canRetry ? 'Try Again' : 'Max Retries Reached'}
                  </button>
                  
                  <button
                    onClick={clearError}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Clear Error
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* News Grid */}
          <NewsGrid 
            articles={articles} 
            isLoading={isLoading} 
            error={error}
          />
        </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

// Loading state for the entire NewsFeed
export function NewsFeedSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <div className="w-24 h-6 bg-gray-200 rounded mb-4 animate-pulse"></div>
          <CalendarSkeleton />
        </div>
        
        <div className="lg:col-span-3">
          <div className="mb-8 animate-pulse">
            <div className="w-48 h-8 bg-gray-200 rounded mb-2"></div>
            <div className="w-64 h-5 bg-gray-200 rounded"></div>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="w-full h-32 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}