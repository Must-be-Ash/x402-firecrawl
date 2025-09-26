import { NewsArticle } from '@/lib/types/news';
import { saveNewsForDate } from '@/lib/db/operations';

export const sampleNewsArticles: NewsArticle[] = [
  {
    headline: "Breaking: Major Technology Advancement in AI Research",
    description: "Researchers at leading universities announce breakthrough in artificial intelligence capabilities, showing significant improvements in language understanding and reasoning.",
    source: {
      name: "Tech News Daily",
      url: "https://example.com/tech-news/ai-breakthrough-2025",
      favicon: "https://example.com/favicon.ico"
    },
    publishedDate: new Date('2025-08-27T10:30:00Z'),
    summary: "A consortium of researchers has made a significant breakthrough in AI research, developing new models that show remarkable improvements in understanding and reasoning. The advancement could revolutionize how AI systems process and respond to complex queries, bringing us closer to more human-like artificial intelligence.",
    imageUrl: "https://example.com/images/ai-research.jpg",
    metadata: {
      firecrawlId: "sample_ai_breakthrough_001",
      scrapedAt: new Date(),
      contentHash: "hash_ai_breakthrough_001"
    }
  },
  {
    headline: "Climate Summit Reaches Historic Agreement on Carbon Emissions",
    description: "World leaders unite at global climate summit to establish ambitious new targets for carbon emission reductions over the next decade.",
    source: {
      name: "Global News",
      url: "https://example.com/global/climate-summit-agreement",
      favicon: "https://example.com/favicon.ico"
    },
    publishedDate: new Date('2025-08-27T14:45:00Z'),
    summary: "The international climate summit has concluded with a groundbreaking agreement among 195 nations to implement more aggressive carbon emission reduction targets. The new framework sets binding commitments for developed nations and provides support mechanisms for developing countries to transition to renewable energy sources.",
    imageUrl: "https://example.com/images/climate-summit.jpg",
    metadata: {
      firecrawlId: "sample_climate_summit_002",
      scrapedAt: new Date(),
      contentHash: "hash_climate_summit_002"
    }
  },
  {
    headline: "Vancouver Hosts International Tech Conference",
    description: "The Pacific Tech Summit brings together industry leaders and innovators to Vancouver, showcasing cutting-edge technologies and discussing future trends.",
    source: {
      name: "Vancouver Tech Report",
      url: "https://example.com/vancouver/tech-conference-2025",
      favicon: "https://example.com/favicon.ico"
    },
    publishedDate: new Date('2025-08-27T09:15:00Z'),
    summary: "Vancouver's convention center is bustling with activity as the Pacific Tech Summit kicks off its three-day program. The conference features keynote speakers from major technology companies, startup pitch competitions, and exhibitions of emerging technologies including quantum computing, biotechnology, and sustainable energy solutions.",
    imageUrl: "https://example.com/images/tech-conference.jpg",
    metadata: {
      firecrawlId: "sample_vancouver_tech_003",
      scrapedAt: new Date(),
      contentHash: "hash_vancouver_tech_003"
    }
  },
  {
    headline: "Economic Markets Show Strong Recovery Signals",
    description: "Financial analysts report positive indicators across major stock exchanges, suggesting robust economic recovery following recent global challenges.",
    source: {
      name: "Financial Times",
      url: "https://example.com/finance/market-recovery-signals",
      favicon: "https://example.com/favicon.ico"
    },
    publishedDate: new Date('2025-08-27T11:20:00Z'),
    summary: "Major stock indices are posting gains for the fifth consecutive week, with technology and renewable energy sectors leading the rally. Economic indicators suggest increased consumer confidence and business investment, signaling a strong recovery trajectory that could continue through the remainder of the year.",
    metadata: {
      firecrawlId: "sample_market_recovery_004",
      scrapedAt: new Date(),
      contentHash: "hash_market_recovery_004"
    }
  },
  {
    headline: "Healthcare Innovation: New Treatment Shows Promise",
    description: "Clinical trials for a revolutionary new treatment demonstrate significant success rates in treating previously difficult medical conditions.",
    source: {
      name: "Medical Research Journal",
      url: "https://example.com/medical/treatment-breakthrough",
      favicon: "https://example.com/favicon.ico"
    },
    publishedDate: new Date('2025-08-27T16:30:00Z'),
    summary: "A new therapeutic approach developed by an international team of medical researchers has shown exceptional results in phase III clinical trials. The treatment, which uses advanced gene therapy techniques, has demonstrated an 85% success rate in treating conditions that were previously considered difficult to manage.",
    metadata: {
      firecrawlId: "sample_medical_treatment_005",
      scrapedAt: new Date(),
      contentHash: "hash_medical_treatment_005"
    }
  }
];

export async function insertSampleNews(date: string = '2025-08-27', timezone: string = 'America/Vancouver') {
  try {
    console.log(`Inserting ${sampleNewsArticles.length} sample articles for ${date} (${timezone})`);

    // Generate location identifier from timezone
    const location = 'CA-Vancouver'; // Default for sample data

    await saveNewsForDate(date, timezone, location, sampleNewsArticles, {
      searchQuery: `sample news ${date} Vancouver Canada`,
      firecrawlCost: 0, // Sample data doesn't cost anything
      fetchDuration: 0
    });
    
    console.log('Sample news data inserted successfully');
    return true;
  } catch (error) {
    console.error('Failed to insert sample news:', error);
    return false;
  }
}

export function generateSampleNewsForDate(date: string): NewsArticle[] {
  const baseDate = new Date(date);
  
  return sampleNewsArticles.map((article, index) => ({
    ...article,
    publishedDate: new Date(baseDate.getTime() + (index * 60 * 60 * 1000)), // Spread articles throughout the day
    metadata: {
      ...article.metadata,
      firecrawlId: `sample_${date}_${index.toString().padStart(3, '0')}`,
      contentHash: `hash_${date}_${index}`,
      scrapedAt: new Date()
    }
  }));
}