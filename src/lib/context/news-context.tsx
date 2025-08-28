'use client';

import { createContext, useContext, useReducer, ReactNode, useCallback, useEffect, useRef } from 'react';
import { NewsArticle, ErrorCode, NewsResponse } from '@/lib/types/news';
import { formatDateForAPI } from '@/lib/utils/date-utils';
import { API_ROUTES } from '@/lib/utils/constants';

// Types
interface NewsState {
  articles: NewsArticle[];
  availableDates: Date[];
  selectedDate: Date;
  timezone: string;
  isLoading: boolean;
  error: string | null;
  errorCode?: ErrorCode;
  isCached: boolean;
  lastFetched: Date | null;
  retryCount: number;
}


type NewsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: { error: string; code?: ErrorCode } }
  | { type: 'SET_ARTICLES'; payload: { articles: NewsArticle[]; cached: boolean; date: Date } }
  | { type: 'SET_SELECTED_DATE'; payload: Date }
  | { type: 'SET_TIMEZONE'; payload: string }
  | { type: 'ADD_AVAILABLE_DATE'; payload: Date }
  | { type: 'SET_AVAILABLE_DATES'; payload: Date[] }
  | { type: 'INCREMENT_RETRY'; payload?: never }
  | { type: 'RESET_RETRY'; payload?: never }
  | { type: 'CLEAR_ERROR'; payload?: never };

// Initial state
const initialState: NewsState = {
  articles: [],
  availableDates: [],
  selectedDate: new Date(),
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  isLoading: false,
  error: null,
  errorCode: undefined,
  isCached: false,
  lastFetched: null,
  retryCount: 0,
};

// Reducer
function newsReducer(state: NewsState, action: NewsAction): NewsState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
        errorCode: action.payload.code,
        articles: [],
        isCached: false,
      };
    
    case 'SET_ARTICLES':
      return {
        ...state,
        articles: action.payload.articles,
        isCached: action.payload.cached,
        isLoading: false,
        error: null,
        errorCode: undefined,
        lastFetched: new Date(),
        retryCount: 0,
      };
    
    case 'SET_SELECTED_DATE':
      return {
        ...state,
        selectedDate: action.payload,
        // Reset articles when date changes
        articles: [],
        error: null,
        errorCode: undefined,
        isCached: false,
        retryCount: 0,
      };
    
    case 'SET_TIMEZONE':
      return { ...state, timezone: action.payload };
    
    case 'ADD_AVAILABLE_DATE':
      const dateStr = formatDateForAPI(action.payload);
      const exists = state.availableDates.some(d => formatDateForAPI(d) === dateStr);
      if (!exists) {
        return {
          ...state,
          availableDates: [...state.availableDates, action.payload]
            .sort((a, b) => b.getTime() - a.getTime()),
        };
      }
      return state;
    
    case 'SET_AVAILABLE_DATES':
      return {
        ...state,
        availableDates: action.payload.sort((a, b) => b.getTime() - a.getTime()),
      };
    
    case 'INCREMENT_RETRY':
      return { ...state, retryCount: state.retryCount + 1 };
    
    case 'RESET_RETRY':
      return { ...state, retryCount: 0 };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null, errorCode: undefined };
    
    default:
      return state;
  }
}

// Context
interface NewsContextType extends NewsState {
  fetchNews: (date: Date, force?: boolean) => Promise<void>;
  selectDate: (date: Date) => void;
  setTimezone: (timezone: string) => void;
  retry: () => Promise<void>;
  clearError: () => void;
  refreshAvailableDates: () => Promise<void>;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

// Provider
interface NewsProviderProps {
  children: ReactNode;
  initialDate?: Date;
  initialTimezone?: string;
}

export function NewsProvider({ 
  children, 
  initialDate = new Date(),
  initialTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
}: NewsProviderProps) {
  const [state, dispatch] = useReducer(newsReducer, {
    ...initialState,
    selectedDate: initialDate,
    timezone: initialTimezone,
  });

  // Track active requests to prevent duplicates and rapid calls
  const activeRequestRef = useRef<string | null>(null);
  const lastRequestTimeRef = useRef<number>(0);
  const DEBOUNCE_DELAY = 500; // 500ms debounce

  // Fetch news for a specific date
  const fetchNews = useCallback(async (date: Date, force: boolean = false) => {
    const dateString = formatDateForAPI(date);
    const now = Date.now();
    
    // Implement debouncing to prevent rapid calls
    if (!force && (now - lastRequestTimeRef.current) < DEBOUNCE_DELAY) {
      console.log('Request debounced, too soon since last request');
      return;
    }
    
    // Prevent duplicate requests for the same date
    if (activeRequestRef.current === dateString) {
      console.log(`Request already active for ${dateString}, skipping`);
      return;
    }
    
    // Don't fetch if already loading or if we already have data for this date (unless forced)
    if (state.isLoading || (!force && state.articles.length > 0 && 
        formatDateForAPI(state.selectedDate) === dateString)) {
      console.log(`Already have data for ${dateString} or loading, skipping`);
      return;
    }
    
    // Set active request and update timing
    activeRequestRef.current = dateString;
    lastRequestTimeRef.current = now;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const dateStr = formatDateForAPI(date);
      const url = `${API_ROUTES.NEWS}?date=${dateStr}&timezone=${encodeURIComponent(state.timezone)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add cache control for better performance
        cache: 'default',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : errorData.message || `HTTP ${response.status}: Failed to fetch news`;
        throw new Error(errorMessage);
      }

      const data: NewsResponse = await response.json();

      if (!data.success) {
        // Handle both string error and structured ErrorResponse format
        let errorMessage = 'Failed to fetch news';
        let errorCode: ErrorCode | undefined;
        
        if (typeof data.error === 'string') {
          errorMessage = data.error;
        } else if (data.error && typeof data.error === 'object') {
          const errorObj = data.error as { message: string; code?: ErrorCode };
          errorMessage = errorObj.message;
          errorCode = errorObj.code;
        }
        
        const error = new Error(errorMessage);
        // Attach error code to the error object for later use
        (error as Error & { code?: ErrorCode }).code = errorCode;
        throw error;
      }

      dispatch({
        type: 'SET_ARTICLES',
        payload: {
          articles: data.data.articles,
          cached: data.data.cached,
          date,
        },
      });

      // Add this date to available dates if it has articles
      if (data.data.articles.length > 0) {
        dispatch({ type: 'ADD_AVAILABLE_DATE', payload: date });
      }

    } catch (error) {
      console.error('Error fetching news:', error);
      
      let errorCode: ErrorCode | undefined;
      let errorMessage = 'Failed to fetch news';

      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check if error code was attached to the error object
        const errorWithCode = error as Error & { code?: ErrorCode };
        if (errorWithCode.code && Object.values(ErrorCode).includes(errorWithCode.code)) {
          errorCode = errorWithCode.code;
        } else {
          // Fallback: Determine error code based on error message
          if (errorMessage.includes('INVALID_DATE')) {
            errorCode = ErrorCode.INVALID_DATE;
          } else if (errorMessage.includes('NO_DATA_FOUND')) {
            errorCode = ErrorCode.NO_DATA_FOUND;
          } else if (errorMessage.includes('PAYMENT_FAILED') || errorMessage.includes('payment')) {
            errorCode = ErrorCode.PAYMENT_FAILED;
          } else if (errorMessage.includes('FIRECRAWL_ERROR')) {
            errorCode = ErrorCode.FIRECRAWL_ERROR;
          } else if (errorMessage.includes('DATABASE_ERROR')) {
            errorCode = ErrorCode.DATABASE_ERROR;
          } else if (errorMessage.includes('RATE_LIMITED') || errorMessage.includes('cooling down') || errorMessage.includes('wait')) {
            errorCode = ErrorCode.RATE_LIMITED;
            // Extract wait time from circuit breaker message for better UX
            const waitMatch = errorMessage.match(/wait (\d+) seconds/);
            if (waitMatch) {
              const waitTime = parseInt(waitMatch[1]);
              errorMessage = `System is cooling down to prevent rapid API calls. Please wait ${waitTime} seconds before trying again.`;
            }
          }
        }
      }

      dispatch({
        type: 'SET_ERROR',
        payload: { error: errorMessage, code: errorCode },
      });
    } finally {
      // Always clear the active request when done
      activeRequestRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timezone]); // Only depend on timezone to avoid infinite re-renders

  // Select a new date
  const selectDate = useCallback((date: Date) => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: date });
  }, []);

  // Set timezone
  const setTimezone = useCallback((timezone: string) => {
    dispatch({ type: 'SET_TIMEZONE', payload: timezone });
  }, []);

  // Retry failed request
  const retry = useCallback(async () => {
    if (state.retryCount < 3) { // Max 3 retries
      dispatch({ type: 'INCREMENT_RETRY' });
      await fetchNews(state.selectedDate, true);
    } else {
      dispatch({
        type: 'SET_ERROR',
        payload: {
          error: 'Maximum retry attempts reached. Please refresh the page.',
          code: ErrorCode.RATE_LIMITED,
        },
      });
    }
  }, [state.retryCount, state.selectedDate, fetchNews]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
    dispatch({ type: 'RESET_RETRY' });
  }, []);

  // Refresh available dates (could be enhanced to fetch from API)
  const refreshAvailableDates = useCallback(async () => {
    // For now, we build available dates as users fetch news
    // In a production app, you might have a dedicated endpoint
    const today = new Date();
    const dates = [today];
    
    // Add some recent dates that might have news
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      dates.push(date);
    }
    
    dispatch({ type: 'SET_AVAILABLE_DATES', payload: dates });
  }, []);

  // Auto-fetch when selectedDate or timezone changes
  useEffect(() => {
    if (state.selectedDate && !state.isLoading) {
      fetchNews(state.selectedDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedDate, state.timezone]); // Remove fetchNews from dependencies to prevent infinite loop

  // Initialize available dates on mount
  useEffect(() => {
    refreshAvailableDates();
  }, [refreshAvailableDates]);

  const contextValue: NewsContextType = {
    ...state,
    fetchNews,
    selectDate,
    setTimezone,
    retry,
    clearError,
    refreshAvailableDates,
  };

  return (
    <NewsContext.Provider value={contextValue}>
      {children}
    </NewsContext.Provider>
  );
}

// Hook to use the context
export function useNews() {
  const context = useContext(NewsContext);
  if (context === undefined) {
    throw new Error('useNews must be used within a NewsProvider');
  }
  return context;
}

// Hook for date-specific operations
export function useNewsDate() {
  const { selectedDate, selectDate, availableDates } = useNews();
  
  const isDateAvailable = useCallback((date: Date) => {
    return availableDates.some(availableDate => 
      formatDateForAPI(availableDate) === formatDateForAPI(date)
    );
  }, [availableDates]);

  const getNextAvailableDate = useCallback(() => {
    const currentIndex = availableDates.findIndex(date => 
      formatDateForAPI(date) === formatDateForAPI(selectedDate)
    );
    return currentIndex > 0 ? availableDates[currentIndex - 1] : null;
  }, [availableDates, selectedDate]);

  const getPreviousAvailableDate = useCallback(() => {
    const currentIndex = availableDates.findIndex(date => 
      formatDateForAPI(date) === formatDateForAPI(selectedDate)
    );
    return currentIndex < availableDates.length - 1 ? availableDates[currentIndex + 1] : null;
  }, [availableDates, selectedDate]);

  return {
    selectedDate,
    selectDate,
    availableDates,
    isDateAvailable,
    getNextAvailableDate,
    getPreviousAvailableDate,
  };
}

// Hook for error handling
export function useNewsError() {
  const { error, errorCode, retryCount, retry, clearError } = useNews();
  
  const canRetry = retryCount < 3;
  
  const getErrorMessage = useCallback(() => {
    if (!error) return null;
    
    switch (errorCode) {
      case ErrorCode.INVALID_DATE:
        return 'The selected date is invalid. Please choose a different date.';
      case ErrorCode.NO_DATA_FOUND:
        return 'No news articles found for this date. Try selecting a more recent date.';
      case ErrorCode.PAYMENT_FAILED:
        return 'Payment processing failed. Our team has been notified.';
      case ErrorCode.FIRECRAWL_ERROR:
        return 'News service is temporarily unavailable. Please try again later.';
      case ErrorCode.DATABASE_ERROR:
        return 'Database connection failed. Please try again in a moment.';
      case ErrorCode.RATE_LIMITED:
        return 'Too many requests. Please wait a moment before trying again.';
      default:
        return error;
    }
  }, [error, errorCode]);

  return {
    error,
    errorCode,
    errorMessage: getErrorMessage(),
    retryCount,
    canRetry,
    retry,
    clearError,
  };
}