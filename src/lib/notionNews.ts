import { NewsItem } from '@/types/news';

export interface NewsDataSource {
  list(): Promise<NewsItem[]>;
}

export class LocalJsonNews implements NewsDataSource {
  async list(): Promise<NewsItem[]> {
    const res = await fetch("/data/news.json");
    if (!res.ok) {
      throw new Error(`Failed to fetch news data: ${res.statusText}`);
    }
    return res.json();
  }
}

// Placeholder: when ready, swap in a Notion-backed class
export class NotionNews implements NewsDataSource {
  constructor(private opts: { databaseId: string; token?: string }) {}
  
  async list(): Promise<NewsItem[]> {
    // TODO: Fetch from Notion API and map properties:
    // title -> title, date -> publishedAt, multi-selects -> companies & tags, select -> type, url -> url, files -> heroImage, rich text -> excerpt
    // For now, throw to ensure we don't silently use it.
    throw new Error("Notion adapter not wired yet.");
  }
}

// Default data source - can be swapped later
export const newsDataSource: NewsDataSource = new LocalJsonNews();