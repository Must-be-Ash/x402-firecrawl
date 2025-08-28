'use client';

import { useState } from 'react';
import { getTodayInTimezone } from '@/lib/utils/date-utils';
import { NewsProvider } from '@/lib/context/news-context';
import NewsFeed from '@/components/news/news-feed';

// Simple default timezone - can be made configurable later if needed
const DEFAULT_TIMEZONE = 'America/Vancouver';

export default function Home() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = getTodayInTimezone(DEFAULT_TIMEZONE);
    return new Date(today);
  });
  
  const [timezone] = useState(DEFAULT_TIMEZONE);

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
