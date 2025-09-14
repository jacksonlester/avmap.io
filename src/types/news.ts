export type StoryType = "Announcement" | "Launch" | "Partnership" | "Funding" | "Analysis" | "Regulatory" | "Safety" | "Other";

export type NewsItem = {
  id: string;
  slug: string;
  title: string;
  source: string;      // e.g., AP, TechCrunch
  url: string;         // original article link (external)
  publishedAt: string; // ISO date
  type: StoryType;
  companies: string[]; // e.g., ["Waymo","Zoox","Tesla","Uber","Lyft","May Mobility"]
  tags: string[];      // freeform
  excerpt: string;
  heroImage?: string;  // optional thumbnail
};

export interface NewsFilters {
  types: StoryType[];
  companies: string[];
  search: string;
}