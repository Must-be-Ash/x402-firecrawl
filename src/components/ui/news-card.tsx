import Image from 'next/image';
import { formatDisplayDate } from '@/lib/utils/date-utils';

interface NewsCardProps {
  headline: string;
  summary: string;
  source: {
    name: string;
    url: string;
    favicon?: string;
  };
  publishedDate?: Date | string;
  imageUrl?: string;
  onClick?: () => void;
}

// Clean up headline by removing dates and common unwanted patterns
function cleanHeadline(headline: string): string {
  return headline
    // Remove dates in format YYYY-MM-DD or similar
    .replace(/\s*-?\s*\d{4}-\d{1,2}-\d{1,2}\s*$/g, '')
    .replace(/\s*\|\s*\d{4}-\d{1,2}-\d{1,2}\s*$/g, '')
    // Remove "Today's top headlines from..." patterns
    .replace(/^Today's\s+(top\s+|evening\s+|morning\s+)?headlines\s+from\s+/i, '')
    // Remove trailing " - YYYY-MM-DD" patterns
    .replace(/\s*-\s*\d{4}-\d{1,2}-\d{1,2}$/g, '')
    .trim();
}

export default function NewsCard({
  headline,
  summary,
  source,
  publishedDate,
  imageUrl,
  onClick,
}: NewsCardProps) {
  // Use the original headline as the main title, but clean it up
  const cleanedHeadline = cleanHeadline(headline);
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.open(source.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <article
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer border border-gray-200 min-h-[350px] flex flex-col"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Read article: ${cleanedHeadline}`}
    >
      {imageUrl && (
        <div className="w-full h-48 bg-gray-200 overflow-hidden">
          <Image
            src={imageUrl}
            alt={headline}
            width={400}
            height={192}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          {source.favicon && (
            <Image
              src={source.favicon}
              alt={`${source.name} icon`}
              width={16}
              height={16}
              className="w-4 h-4 rounded"
            />
          )}
          <span className="text-sm text-gray-600 font-medium">
            {source.name}
          </span>
          {publishedDate && (
            <>
              <span className="text-gray-400">•</span>
              <time
                dateTime={publishedDate instanceof Date ? publishedDate.toISOString() : new Date(publishedDate).toISOString()}
                className="text-sm text-gray-500"
              >
                {formatDisplayDate(publishedDate instanceof Date ? publishedDate : new Date(publishedDate))}
              </time>
            </>
          )}
        </div>

        <p className="text-gray-900 text-base font-semibold leading-relaxed mb-4 flex-1">
          {summary}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <button
            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              window.open(source.url, '_blank', 'noopener,noreferrer');
            }}
          >
            Read full article
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}

// Skeleton loading component for NewsCard
export function NewsCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden animate-pulse">
      <div className="w-full h-48 bg-gray-200"></div>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="w-20 h-4 bg-gray-200 rounded"></div>
          <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
          <div className="w-16 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-2 mb-3">
          <div className="h-6 bg-gray-200 rounded w-full"></div>
          <div className="h-6 bg-gray-200 rounded w-4/5"></div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
  );
}