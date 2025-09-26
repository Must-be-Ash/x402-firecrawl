import Image from 'next/image';
import { NewsArticle } from '@/lib/types/news';
import NewsCard, { NewsCardSkeleton } from '@/components/ui/news-card';
import { formatDisplayDate } from '@/lib/utils/date-utils';

interface NewsGridProps {
  articles: NewsArticle[];
  isLoading?: boolean;
  error?: string | null;
}

export default function NewsGrid({ articles, isLoading, error }: NewsGridProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {Array(8).fill(0).map((_, index) => (
          <NewsCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!articles || articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center max-w-md">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" 
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No news found
          </h3>
          <p className="text-gray-600">
            There are no news articles available for this date. Try selecting a different date.
          </p>
        </div>
      </div>
    );
  }

  // Success state with articles
  return (
    <div className="space-y-6">
      {/* Articles count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {articles.length} article{articles.length !== 1 ? 's' : ''}
        </p>
        <div className="text-sm text-gray-500">
          Updated {new Date().toLocaleTimeString(undefined, { 
            hour: 'numeric', 
            minute: '2-digit'
          })}
        </div>
      </div>

      {/* News grid */}
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article, index) => (
          <NewsCard
            key={`${article.metadata.firecrawlId}-${index}`}
            headline={article.headline}
            summary={article.summary}
            source={article.source}
            publishedDate={article.publishedDate}
            imageUrl={article.imageUrl}
          />
        ))}
      </div>
    </div>
  );
}

// Compact grid variant for smaller screens or sidebar
export function CompactNewsGrid({ articles, isLoading, error }: NewsGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(4).fill(0).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="flex gap-4">
              <div className="w-20 h-16 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !articles || articles.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">
          {error || 'No articles available'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.slice(0, 5).map((article, index) => (
        <div
          key={`${article.metadata.firecrawlId}-${index}`}
          className="flex gap-4 p-3 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
          onClick={() => window.open(article.source.url, '_blank', 'noopener,noreferrer')}
        >
          {article.imageUrl && (
            <Image
              src={article.imageUrl}
              alt={article.headline}
              width={80}
              height={64}
              className="w-20 h-16 object-cover rounded"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
              {article.headline}
            </h4>
            <p className="text-xs text-gray-600 mb-1">
              {article.source.name}
            </p>
            {article.publishedDate && (
              <time className="text-xs text-gray-500">
                {formatDisplayDate(article.publishedDate)}
              </time>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}