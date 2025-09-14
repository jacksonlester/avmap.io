import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Filters } from '@/components/news/Filters';
import { NewsCard } from '@/components/news/Card';
import { EmptyState } from '@/components/news/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { NewsItem, NewsFilters, StoryType } from '@/types/news';
import { newsDataSource } from '@/lib/notionNews';

const News = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse filters from URL
  const [filters, setFilters] = useState<NewsFilters>(() => {
    const types = searchParams.get('types')?.split(',').filter(Boolean) as StoryType[] || [];
    const companies = searchParams.get('companies')?.split(',').filter(Boolean) || [];
    const search = searchParams.get('q') || '';
    
    return { types, companies, search };
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.types.length > 0) {
      params.set('types', filters.types.join(','));
    }
    if (filters.companies.length > 0) {
      params.set('companies', filters.companies.join(','));
    }
    if (filters.search) {
      params.set('q', filters.search);
    }
    
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Load news data
  useEffect(() => {
    const loadNews = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await newsDataSource.list();
        setNews(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load news');
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, []);

  // Filter and sort news
  const filteredNews = useMemo(() => {
    let filtered = news;

    // Apply type filter
    if (filters.types.length > 0) {
      filtered = filtered.filter(item => filters.types.includes(item.type));
    }

    // Apply company filter
    if (filters.companies.length > 0) {
      filtered = filtered.filter(item => 
        item.companies.some(company => filters.companies.includes(company))
      );
    }

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm) ||
        item.excerpt.toLowerCase().includes(searchTerm) ||
        item.source.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }, [news, filters]);

  // Get available companies for filter
  const availableCompanies = useMemo(() => {
    const companies = new Set<string>();
    news.forEach(item => {
      item.companies.forEach(company => companies.add(company));
    });
    return Array.from(companies).sort();
  }, [news]);

  const clearFilters = () => {
    setFilters({ types: [], companies: [], search: '' });
  };

  const hasActiveFilters = filters.types.length > 0 || filters.companies.length > 0 || filters.search.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-muted/30 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              AV News
            </h1>
            <p className="text-xl text-muted-foreground">
              Stay updated with the latest autonomous vehicle news, launches, partnerships, and industry analysis.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-14 z-40">
        <Filters
          filters={filters}
          onFiltersChange={setFilters}
          availableCompanies={availableCompanies}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[16/9] w-full rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-destructive mb-4">Error loading news: {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filteredNews.length === 0 ? (
          <EmptyState 
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        ) : (
          <>
            {/* Results summary */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                Showing {filteredNews.length} of {news.length} articles
                {hasActiveFilters && " (filtered)"}
              </p>
            </div>

            {/* News grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredNews.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default News;