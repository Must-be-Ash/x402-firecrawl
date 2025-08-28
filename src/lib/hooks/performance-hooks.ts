import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { NewsArticle } from '@/lib/types/news';

// Hook for debouncing values to prevent excessive API calls
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook for throttling function calls
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): T {
  const lastCall = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        return func(...args);
      } else {
        timeoutRef.current = setTimeout(() => {
          lastCall.current = Date.now();
          func(...args);
        }, delay - (now - lastCall.current));
      }
    }) as T,
    [func, delay]
  );
}

// Hook for memoizing expensive computations
export function useExpensiveComputation<T>(
  computeFn: () => T,
  deps: React.DependencyList
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => computeFn(), deps);
}

// Hook for lazy loading components
export function useLazyLoad(threshold = 100) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [threshold]);

  return { isVisible, elementRef };
}

// Hook for optimizing article list rendering
export function useVirtualization(
  items: NewsArticle[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStartIndex = Math.floor(scrollTop / itemHeight);
  const visibleEndIndex = Math.min(
    visibleStartIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length - 1
  );

  const visibleItems = useMemo(() => {
    return items.slice(visibleStartIndex, visibleEndIndex + 1);
  }, [items, visibleStartIndex, visibleEndIndex]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStartIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  };
}

// Hook for prefetching news data
export function usePrefetch() {
  const prefetchCache = useRef(new Map<string, Promise<unknown>>());

  const prefetch = useCallback(async (date: Date, timezone: string) => {
    const key = `${date.toISOString()}-${timezone}`;
    
    if (prefetchCache.current.has(key)) {
      return prefetchCache.current.get(key);
    }

    const promise = fetch(`/api/news?date=${date.toISOString().split('T')[0]}&timezone=${timezone}`)
      .then(res => res.json())
      .catch(console.warn);

    prefetchCache.current.set(key, promise);
    
    // Clean up old entries after 5 minutes
    setTimeout(() => {
      prefetchCache.current.delete(key);
    }, 5 * 60 * 1000);

    return promise;
  }, []);

  return { prefetch };
}

// Hook for managing component state with performance optimizations
export function useOptimizedState<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const previousValueRef = useRef<T>(initialValue);

  const optimizedSetState = useCallback((newValue: T | ((prev: T) => T)) => {
    setState(prevState => {
      const nextState = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prevState)
        : newValue;

      // Only update if value actually changed
      if (JSON.stringify(nextState) !== JSON.stringify(previousValueRef.current)) {
        previousValueRef.current = nextState;
        return nextState;
      }
      
      return prevState;
    });
  }, []);

  return [state, optimizedSetState] as const;
}

// Hook for managing focus and keyboard navigation
export function useFocusManagement() {
  const focusElementRef = useRef<HTMLElement | null>(null);

  const setFocusElement = useCallback((element: HTMLElement | null) => {
    focusElementRef.current = element;
  }, []);

  const focusElement = useCallback(() => {
    if (focusElementRef.current) {
      focusElementRef.current.focus();
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent, onEnter?: () => void, onEscape?: () => void) => {
    switch (e.key) {
      case 'Enter':
        if (onEnter) {
          e.preventDefault();
          onEnter();
        }
        break;
      case 'Escape':
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
        break;
    }
  }, []);

  return {
    setFocusElement,
    focusElement,
    handleKeyDown,
  };
}

// Hook for performance monitoring
export function usePerformanceMonitoring(componentName: string) {
  const renderStartTime = useRef<number | null>(null);
  const renderCount = useRef(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current += 1;
  });

  useEffect(() => {
    return () => {
      if (renderStartTime.current) {
        const renderDuration = performance.now() - renderStartTime.current;
        
        if (renderDuration > 16) { // Log slow renders (> 1 frame at 60fps)
          console.warn(`[Performance] ${componentName} slow render:`, {
            duration: renderDuration.toFixed(2) + 'ms',
            renderCount: renderCount.current,
          });
        }
      }
    };
  });

  return {
    renderCount: renderCount.current,
  };
}