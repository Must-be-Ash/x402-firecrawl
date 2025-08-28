interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
}

export default function LoadingSpinner({ 
  size = 'md', 
  text,
  variant = 'spinner' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  if (variant === 'dots') {
    return (
      <div className="flex flex-col items-center justify-center py-8" aria-live="polite">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
        </div>
        {text && (
          <p className="mt-4 text-sm text-gray-600 animate-pulse">{text}</p>
        )}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className="flex flex-col items-center justify-center py-8" aria-live="polite">
        <div className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-pulse`}></div>
        {text && (
          <p className="mt-4 text-sm text-gray-600 animate-pulse">{text}</p>
        )}
      </div>
    );
  }

  // Default spinner variant
  return (
    <div className="flex flex-col items-center justify-center py-8" aria-live="polite">
      <div 
        className={`${sizeClasses[size]} border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      ></div>
      {text && (
        <p className="mt-4 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
}

// Full page loading component
export function FullPageLoading({ text = "Loading news..." }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  );
}

// Inline loading component
export function InlineLoading({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-4">
      <LoadingSpinner size="sm" text={text} variant="dots" />
    </div>
  );
}

// Content skeleton components
export function ContentSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {Array(count).fill(0).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
          <div className="w-full h-32 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
}