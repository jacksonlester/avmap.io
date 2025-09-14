import { NewsItem, StoryType } from '@/types/news';

interface RSSFeed {
  url: string;
  source: string;
  defaultType: StoryType;
  companiesKeywords: Record<string, string[]>; // company name -> keywords to match
}

// RSS feeds for autonomous vehicle news
const RSS_FEEDS: RSSFeed[] = [
  {
    url: 'https://feeds.techcrunch.com/techcrunch/startups',
    source: 'TechCrunch',
    defaultType: 'Analysis',
    companiesKeywords: {
      'Waymo': ['waymo', 'google autonomous'],
      'Tesla': ['tesla', 'robotaxi', 'fsd'],
      'Uber': ['uber', 'autonomous'],
      'Lyft': ['lyft', 'robotaxi'],
      'Zoox': ['zoox', 'amazon autonomous'],
      'May Mobility': ['may mobility'],
      'Cruise': ['cruise', 'gm autonomous'],
      'Aurora': ['aurora innovation'],
      'Motional': ['motional', 'hyundai autonomous']
    }
  },
  {
    url: 'https://www.theverge.com/rss/transportation/index.xml',
    source: 'The Verge',
    defaultType: 'Analysis',
    companiesKeywords: {
      'Waymo': ['waymo'],
      'Tesla': ['tesla'],
      'Uber': ['uber'],
      'Lyft': ['lyft'],
      'Zoox': ['zoox'],
      'May Mobility': ['may mobility'],
      'Cruise': ['cruise'],
      'Aurora': ['aurora'],
      'Motional': ['motional']
    }
  }
];

// Keywords that help determine story type
const TYPE_KEYWORDS: Record<StoryType, string[]> = {
  'Launch': ['launch', 'launches', 'debut', 'rollout', 'goes live', 'available now'],
  'Announcement': ['announces', 'announced', 'reveals', 'unveils', 'plans to'],
  'Partnership': ['partnership', 'partners with', 'collaboration', 'teams up', 'joint venture'],
  'Funding': ['funding', 'investment', 'raises', 'series', 'round', 'valuation'],
  'Analysis': ['analysis', 'opinion', 'why', 'how', 'future of', 'impact'],
  'Regulatory': ['regulation', 'regulatory', 'approval', 'permit', 'license', 'ban'],
  'Safety': ['safety', 'accident', 'crash', 'incident', 'investigation'],
  'Other': []
};

export class RSSNewsService {
  /**
   * Fetch and parse RSS feeds to extract autonomous vehicle news
   * Note: This would require a backend service in production due to CORS
   */
  static async fetchFromRSS(): Promise<NewsItem[]> {
    // In a real implementation, this would:
    // 1. Fetch RSS feeds via a backend service (to avoid CORS)
    // 2. Parse XML to extract articles
    // 3. Filter for autonomous vehicle content
    // 4. Extract images from article content
    // 5. Categorize by story type and companies
    
    throw new Error('RSS service requires backend implementation for CORS handling');
  }

  /**
   * Extract companies mentioned in article content
   */
  static extractCompanies(title: string, content: string, keywords: Record<string, string[]>): string[] {
    const text = `${title} ${content}`.toLowerCase();
    const foundCompanies: string[] = [];

    Object.entries(keywords).forEach(([company, companyKeywords]) => {
      if (companyKeywords.some(keyword => text.includes(keyword.toLowerCase()))) {
        foundCompanies.push(company);
      }
    });

    return foundCompanies;
  }

  /**
   * Determine story type based on title and content
   */
  static determineStoryType(title: string, content: string): StoryType {
    const text = `${title} ${content}`.toLowerCase();

    for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
      if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
        return type as StoryType;
      }
    }

    return 'Other';
  }

  /**
   * Extract the main image from article content
   * This would typically scrape the article page for og:image or the first large image
   */
  static async extractArticleImage(url: string): Promise<string | undefined> {
    try {
      // In production, this would:
      // 1. Fetch the article page
      // 2. Parse HTML for og:image meta tag
      // 3. Fallback to first content image
      // 4. Return the image URL
      
      // For now, return undefined - images would need to be manually curated
      // or we'd need a web scraping service
      return undefined;
    } catch (error) {
      console.error('Error extracting article image:', error);
      return undefined;
    }
  }

  /**
   * Create a slug from title
   */
  static createSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Scrape a single article for detailed information
   * This would be used to enhance RSS feed data with full content and images
   */
  static async scrapeArticle(url: string): Promise<{
    title?: string;
    excerpt?: string;
    heroImage?: string;
    publishedAt?: string;
  }> {
    // In production, this would use a service like:
    // - Firecrawl for web scraping
    // - Mercury Parser for article extraction
    // - Or a custom scraping service
    
    return {};
  }
}

// Example of how RSS parsing would work:
export const RSS_EXAMPLE_WORKFLOW = `
1. Backend Service Setup:
   - Create API endpoint: /api/news/sync-rss
   - Use libraries like 'rss-parser' to parse feeds
   - Implement CORS-free fetching

2. Article Processing:
   - Filter RSS items for AV-related keywords
   - Extract article details via web scraping
   - Categorize by companies and story types
   - Download and host images locally

3. Data Storage:
   - Store in database or update JSON file
   - Cache images locally for performance
   - Update news feed periodically (cron job)

4. Frontend Integration:
   - Fetch from local API instead of RSS directly
   - Maintain same NewsItem interface
   - Add "last updated" timestamp
`;