# News App Components

This directory contains all React components for the Daily News application, organized into UI components and feature-specific components.

## Component Structure

```
components/
├── ui/                    # Reusable UI components
│   ├── news-card.tsx     # Individual news article card
│   ├── calendar.tsx      # Date selection calendar
│   ├── loading-spinner.tsx # Loading states and skeletons
│   ├── date-selector.tsx # Compact date navigation
│   └── error-boundary.tsx # Error handling components
├── news/                 # News-specific components
│   ├── news-feed.tsx     # Main news feed orchestrator
│   └── news-grid.tsx     # News articles grid layout
└── index.ts              # Component exports

```

## UI Components

### NewsCard
Displays individual news articles with responsive design and accessibility features.

**Props:**
- `headline: string` - Article headline
- `summary: string` - Article summary/description
- `source: { name: string; url: string; favicon?: string }` - News source info
- `publishedDate?: Date` - Publication date
- `imageUrl?: string` - Article image
- `onClick?: () => void` - Custom click handler

**Features:**
- Responsive card design with hover effects
- Truncated summary with "read more" functionality
- External link icon for source navigation
- Accessibility support (ARIA labels, keyboard navigation)
- Loading skeleton variant

### Calendar
Full-featured calendar for date selection with visual indicators.

**Props:**
- `selectedDate: Date` - Currently selected date
- `onDateSelect: (date: Date) => void` - Date selection callback
- `availableDates: Date[]` - Dates with available news
- `maxDate?: Date` - Maximum selectable date (default: today)
- `isLoading?: boolean` - Loading state

**Features:**
- Month/year navigation with arrow controls
- Visual indicators for dates with cached news
- Disabled state for future dates and loading
- Legend showing date status meanings
- Loading skeleton variant

### DateSelector
Compact date navigation component for quick date changes.

**Props:**
- `selectedDate: Date` - Currently selected date
- `onDateSelect: (date: Date) => void` - Date selection callback
- `maxDate?: Date` - Maximum selectable date
- `availableDates?: Date[]` - Recently available dates
- `isLoading?: boolean` - Loading state

**Features:**
- Previous/next day navigation
- Quick "Today" button
- Recent dates shortcuts
- Status indicators (Today, Available, Loading)
- Compact variant for mobile

### LoadingSpinner
Configurable loading components with multiple variants.

**Props:**
- `size?: 'sm' | 'md' | 'lg'` - Spinner size
- `text?: string` - Loading text
- `variant?: 'spinner' | 'dots' | 'pulse'` - Animation type

**Additional Components:**
- `FullPageLoading` - Full screen loading
- `InlineLoading` - Inline loading with dots
- `ContentSkeleton` - Text content skeleton
- `HeaderSkeleton` - Header skeleton
- `GridSkeleton` - Grid layout skeleton

### ErrorBoundary
React error boundary with customizable fallback UI.

**Props:**
- `children: ReactNode` - Child components
- `fallback?: ReactNode` - Custom error UI
- `onError?: (error, errorInfo) => void` - Error callback

**Additional Components:**
- `NewsErrorFallback` - News-specific error UI
- `CalendarErrorFallback` - Calendar-specific error UI

## News Components

### NewsFeed
Main orchestrator component that manages news data fetching and display.

**Props:**
- `date: Date` - Selected date
- `timezone: string` - User timezone
- `onDateChange: (date: Date) => void` - Date change callback

**Features:**
- Data fetching and state management
- Loading, error, and success states
- Calendar and news grid integration
- Retry logic for failed requests
- Status indicators (cached/fresh)

### NewsGrid
Grid layout for displaying news articles with various states.

**Props:**
- `articles: NewsArticle[]` - News articles array
- `isLoading?: boolean` - Loading state
- `error?: string | null` - Error message

**Features:**
- Responsive grid layout
- Loading skeletons
- Empty and error states
- Article count display
- Compact variant for sidebars

## Usage Examples

### Basic News Feed
```tsx
import { NewsFeed } from '@/components';

function NewsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <NewsFeed
      date={selectedDate}
      timezone={timezone}
      onDateChange={setSelectedDate}
    />
  );
}
```

### Custom News Display
```tsx
import { NewsCard, LoadingSpinner, ErrorBoundary } from '@/components';

function CustomNewsDisplay({ articles, isLoading, error }) {
  if (isLoading) return <LoadingSpinner size="lg" text="Loading news..." />;
  if (error) return <div>Error: {error}</div>;

  return (
    <ErrorBoundary>
      <div className="grid gap-4">
        {articles.map(article => (
          <NewsCard
            key={article.metadata.firecrawlId}
            headline={article.headline}
            summary={article.summary}
            source={article.source}
            publishedDate={article.publishedDate}
            imageUrl={article.imageUrl}
          />
        ))}
      </div>
    </ErrorBoundary>
  );
}
```

### Date Selection
```tsx
import { Calendar, DateSelector } from '@/components';

function DatePicker({ selectedDate, onDateChange, availableDates }) {
  return (
    <div className="space-y-4">
      {/* Full calendar */}
      <Calendar
        selectedDate={selectedDate}
        onDateSelect={onDateChange}
        availableDates={availableDates}
      />
      
      {/* Compact selector */}
      <DateSelector
        selectedDate={selectedDate}
        onDateSelect={onDateChange}
        availableDates={availableDates}
      />
    </div>
  );
}
```

## Styling

All components use Tailwind CSS for styling with:
- Consistent color scheme (blue primary, gray neutrals)
- Responsive design breakpoints
- Hover and focus states
- Smooth transitions
- Accessibility-friendly contrast ratios

## Accessibility Features

- ARIA labels and roles
- Keyboard navigation support
- Screen reader announcements for loading states
- Proper semantic HTML structure
- Focus management
- Color contrast compliance

## Error Handling

Components include comprehensive error handling:
- React Error Boundaries for component crashes
- Network error fallbacks
- User-friendly error messages
- Retry mechanisms
- Development vs production error details