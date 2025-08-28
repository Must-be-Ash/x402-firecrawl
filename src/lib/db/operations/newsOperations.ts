import { connectToDatabase } from '../mongodb';
import { DailyNewsDocument, NewsArticle } from '@/lib/types/news';

export async function getNewsByDate(date: string, timezone: string = 'UTC'): Promise<DailyNewsDocument | null> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<DailyNewsDocument>('daily_news');
    
    const result = await collection.findOne({ 
      date, 
      timezone 
    });
    
    return result;
  } catch (error) {
    console.error('Error fetching news by date:', error);
    throw new Error('Failed to fetch news from database');
  }
}

export async function saveNewsForDate(
  date: string, 
  timezone: string,
  articles: NewsArticle[], 
  metadata: {
    searchQuery: string;
    firecrawlCost?: number;
    fetchDuration?: number;
  }
): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<DailyNewsDocument>('daily_news');
    
    const newsDocument: Omit<DailyNewsDocument, '_id'> = {
      date,
      timezone,
      articles,
      createdAt: new Date(),
      lastUpdated: new Date(),
      metadata: {
        totalArticles: articles.length,
        ...metadata
      }
    };
    
    await collection.replaceOne(
      { date, timezone },
      newsDocument,
      { upsert: true }
    );
    
    console.log(`Saved ${articles.length} articles for ${date} (${timezone})`);
  } catch (error) {
    console.error('Error saving news:', error);
    throw new Error('Failed to save news to database');
  }
}

export async function checkNewsExists(date: string, timezone: string = 'UTC'): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<DailyNewsDocument>('daily_news');
    
    const count = await collection.countDocuments({ 
      date, 
      timezone 
    });
    
    return count > 0;
  } catch (error) {
    console.error('Error checking news existence:', error);
    return false;
  }
}

export async function getAvailableDates(timezone: string = 'UTC', limit: number = 90): Promise<string[]> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<DailyNewsDocument>('daily_news');
    
    const dates = await collection
      .find({ timezone }, { projection: { date: 1, _id: 0 } })
      .sort({ date: -1 })
      .limit(limit)
      .toArray();
    
    return dates.map(doc => doc.date);
  } catch (error) {
    console.error('Error fetching available dates:', error);
    return [];
  }
}

export async function cleanupOldNews(daysToKeep: number = 90): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<DailyNewsDocument>('daily_news');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await collection.deleteMany({
      createdAt: { $lt: cutoffDate }
    });
    
    console.log(`Cleaned up ${result.deletedCount} old news documents`);
  } catch (error) {
    console.error('Error cleaning up old news:', error);
    // Don't throw - this is a maintenance operation
  }
}

export async function getNewsByDateRange(
  startDate: string, 
  endDate: string, 
  timezone: string = 'UTC'
): Promise<DailyNewsDocument[]> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<DailyNewsDocument>('daily_news');
    
    const results = await collection
      .find({ 
        date: { $gte: startDate, $lte: endDate },
        timezone 
      })
      .sort({ date: -1 })
      .toArray();
    
    return results;
  } catch (error) {
    console.error('Error fetching news by date range:', error);
    throw new Error('Failed to fetch news from database');
  }
}