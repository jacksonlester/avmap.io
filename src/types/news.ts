export type NewsItem = {
  id: string;                 // uuid
  title: string;              // required
  url: string;                // required, valid URL
  date: string;               // ISO date (yyyy-mm-dd)
  summary: string;            // 0–500 chars
  topic: string;              // single select
  companies: string[];        // multi
  geography: string[];        // multi
  tags: string[];             // multi
  type: string;               // single select
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
};

export type Taxonomy = {
  topic: string[];            // single-select options
  companies: string[];        // multi
  geography: string[];        // multi
  tags: string[];             // multi
  type: string[];             // single-select options
};

export type NewsFilters = {
  topic?: string;
  companies: string[];
  geography: string[];
  tags: string[];
  type?: string;
  search: string;
};