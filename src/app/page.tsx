'use client';

import { useState, useEffect } from 'react';
import { getTodayInTimezone } from '@/lib/utils/date-utils';
import { NewsProvider } from '@/lib/context/news-context';
import NewsFeed from '@/components/news/news-feed';

/**
 * Detects user's timezone from browser or URL parameter
 * Priority: URL param > Browser detection > Fallback to Vancouver
 */
function getUserTimezone(): string {
  // Check for URL parameter override (for testing)
  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    const timezoneParam = searchParams.get('timezone');
    if (timezoneParam) {
      console.log('Using timezone from URL parameter:', timezoneParam);
      return timezoneParam;
    }

    // Detect from browser
    try {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('Detected browser timezone:', browserTimezone);
      return browserTimezone;
    } catch (error) {
      console.warn('Failed to detect browser timezone:', error);
    }
  }

  // Fallback for SSR or detection failure
  return 'America/Vancouver';
}

export default function Home() {
  // Detect timezone immediately on mount (runs only on client)
  const [timezone, setTimezone] = useState(() => {
    // This runs immediately on client mount
    return getUserTimezone();
  });

  const [selectedDate, setSelectedDate] = useState(() => {
    // During SSR, use America/Vancouver to prevent hydration mismatch
    // Client will update on mount
    if (typeof window === 'undefined') {
      const today = getTodayInTimezone('America/Vancouver');
      return new Date(today + 'T12:00:00');
    }

    const detectedTimezone = getUserTimezone();
    const today = getTodayInTimezone(detectedTimezone);
    console.log('DEBUG: Home page initializing with date:', today, 'timezone:', detectedTimezone);
    return new Date(today + 'T12:00:00');
  });

  // Listen for URL changes (e.g., when user changes ?timezone parameter)
  useEffect(() => {
    const handleUrlChange = () => {
      const detectedTimezone = getUserTimezone();
      setTimezone(detectedTimezone);

      // Update selected date based on detected timezone
      const today = getTodayInTimezone(detectedTimezone);
      setSelectedDate(new Date(today + 'T12:00:00'));
    };

    // Listen for popstate (back/forward) and manual URL changes
    window.addEventListener('popstate', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NewsProvider 
        initialDate={selectedDate}
        initialTimezone={timezone}
      >
        <NewsFeed
          date={selectedDate}
          timezone={timezone}
          onDateChange={handleDateChange}
        />
      </NewsProvider>
    </div>
  );
}
