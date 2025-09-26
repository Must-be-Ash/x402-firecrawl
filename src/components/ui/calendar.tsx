'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore } from 'date-fns';

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  availableDates: Date[];
  maxDate?: Date;
  isLoading?: boolean;
}

export default function Calendar({
  selectedDate,
  onDateSelect,
  availableDates,
  maxDate = new Date(),
  isLoading = false,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Convert available dates to string format for comparison
  const availableDateStrings = availableDates.map(date => format(date, 'yyyy-MM-dd'));

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    if (isBefore(nextMonth, maxDate) || format(nextMonth, 'yyyy-MM') === format(maxDate, 'yyyy-MM')) {
      setCurrentMonth(nextMonth);
    }
  };

  const isDateAvailable = (date: Date) => {
    return availableDateStrings.includes(format(date, 'yyyy-MM-dd'));
  };

  const isDateDisabled = (date: Date) => {
    return !isBefore(date, maxDate) && !isToday(date);
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date) || isLoading) return;
    onDateSelect(date);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          disabled={isLoading}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h2 className="text-xl font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>

        <button
          onClick={goToNextMonth}
          disabled={isLoading || format(currentMonth, 'yyyy-MM') === format(maxDate, 'yyyy-MM')}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isTodayDate = isToday(date);
          const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
          const hasAvailableNews = isDateAvailable(date);
          const isDisabled = isDateDisabled(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              disabled={isDisabled || isLoading}
              className={`
                p-2 text-sm rounded-md transition-colors relative
                ${!isCurrentMonth ? 'text-gray-300 cursor-default' : ''}
                ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'}
                ${isTodayDate ? 'ring-2 ring-blue-500' : ''}
                ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : 'text-gray-900'}
                ${hasAvailableNews && !isSelected ? 'bg-green-50 text-green-800 hover:bg-green-100' : ''}
                ${isLoading ? 'opacity-50 cursor-wait' : ''}
              `}
              title={
                hasAvailableNews 
                  ? `News available for ${format(date, 'MMMM d, yyyy')}`
                  : format(date, 'MMMM d, yyyy')
              }
              aria-label={`${format(date, 'MMMM d, yyyy')}${hasAvailableNews ? ' - News available' : ''}`}
            >
              {format(date, 'd')}
              
              {/* Indicator for available news */}
              {hasAvailableNews && !isSelected && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}

// Skeleton loading state for Calendar
export function CalendarSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
        <div className="w-32 h-6 bg-gray-200 rounded"></div>
        <div className="w-8 h-8 bg-gray-200 rounded"></div>
      </div>

      {/* Days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array(7).fill(0).map((_, i) => (
          <div key={i} className="p-2">
            <div className="w-8 h-4 bg-gray-200 rounded mx-auto"></div>
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {Array(35).fill(0).map((_, i) => (
          <div key={i} className="p-2">
            <div className="w-8 h-8 bg-gray-200 rounded mx-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
}