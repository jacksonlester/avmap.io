import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CreatableSingle, CreatableMulti } from '@/components/ui/creatable-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NewsItem, Taxonomy, NewsFilters } from '@/types/news';
import { format } from 'date-fns';
import { Search, ExternalLink, Calendar, MapPin, Tag, ChevronDown } from 'lucide-react';

export default function News() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({
    topic: [],
    companies: [],
    geography: [],
    tags: [],
    type: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<NewsFilters>(() => ({
    topic: searchParams.get('topic') || undefined,
    companies: searchParams.get('companies')?.split(',').filter(Boolean) || [],
    geography: searchParams.get('geography')?.split(',').filter(Boolean) || [],
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
    type: searchParams.get('type') || undefined,
    search: searchParams.get('search') || '',
  }));

  const [collapsed, setCollapsed] = useState(true);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.topic) params.set('topic', filters.topic);
    if (filters.companies.length > 0) params.set('companies', filters.companies.join(','));
    if (filters.geography.length > 0) params.set('geography', filters.geography.join(','));
    if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
    if (filters.type) params.set('type', filters.type);
    if (filters.search) params.set('search', filters.search);
    setSearchParams(params);
  }, [filters, setSearchParams]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [newsRes, taxonomyRes] = await Promise.all([
          fetch('/data/news.json'),
          fetch('/data/taxonomy.json')
        ]);

        if (newsRes.ok) {
          const newsData = await newsRes.json();
          setNews(newsData);
        }

        if (taxonomyRes.ok) {
          const taxonomyData = await taxonomyRes.json();
          setTaxonomy(taxonomyData);
        }
      } catch (err) {
        setError('Failed to load news data');
        console.error('Error loading news:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter and sort news
  const filteredNews = useMemo(() => {
    let filtered = news.filter(item => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          item.title.toLowerCase().includes(searchLower) ||
          item.summary.toLowerCase().includes(searchLower) ||
          item.companies.some(c => c.toLowerCase().includes(searchLower)) ||
          item.tags.some(t => t.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Topic filter
      if (filters.topic && item.topic !== filters.topic) return false;

      // Type filter
      if (filters.type && item.type !== filters.type) return false;

      // Companies filter (any match)
      if (filters.companies.length > 0) {
        const hasMatchingCompany = filters.companies.some(company =>
          item.companies.includes(company)
        );
        if (!hasMatchingCompany) return false;
      }

      // Geography filter (any match)
      if (filters.geography.length > 0) {
        const hasMatchingGeo = filters.geography.some(geo =>
          item.geography.includes(geo)
        );
        if (!hasMatchingGeo) return false;
      }

      // Tags filter (any match)
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag =>
          item.tags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }

      return true;
    });

    // Sort by date descending
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [news, filters]);

  const clearFilters = () => {
    setFilters({
      topic: undefined,
      companies: [],
      geography: [],
      tags: [],
      type: undefined,
      search: '',
    });
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex">
        <Sidebar variant="sidebar" collapsible="icon" className="border-r-0">
          <SidebarContent className="pt-20 pr-2 bg-background relative">
            {/* Trigger button on the right edge of content */}
            <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 z-10">
              <SidebarTrigger className="bg-background border border-border rounded-full p-1 shadow-md hover:shadow-lg transition-shadow" />
            </div>
            
            <SidebarGroup>
              <SidebarGroupContent className="pr-2">
                <FiltersComponent 
                  filters={filters} 
                  setFilters={setFilters} 
                  taxonomy={taxonomy} 
                  clearFilters={clearFilters} 
                />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <Header />
          
          <main className="flex-1 container mx-auto px-4 py-8" style={{ paddingTop: 'calc(var(--header-h) + 2rem)' }}>
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Autonomous Vehicle News</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Stay updated with the latest developments in autonomous vehicles, robotaxis, and self-driving technology
              </p>
            </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {!loading && !error && (
          <>
            <div className="mb-6">
              <p className="text-muted-foreground">
                Showing {filteredNews.length} of {news.length} articles
              </p>
            </div>

            {filteredNews.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <h3 className="text-lg font-medium mb-2">No articles found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters or search terms
                  </p>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredNews.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h2 className="text-xl font-semibold mb-2 line-clamp-2">
                              {item.title}
                            </h2>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(item.date), 'MMM d, yyyy')}
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a href={item.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Read
                            </a>
                          </Button>
                        </div>

                        {/* Summary */}
                        {item.summary && (
                          <p className="text-muted-foreground line-clamp-3">
                            {item.summary}
                          </p>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{item.topic}</Badge>
                          <Badge variant="outline">{item.type}</Badge>
                          
                          {item.companies.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.companies.map(company => (
                                <Badge key={company} variant="default" className="text-xs">
                                  {company}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {item.geography.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.geography.map(geo => (
                                <Badge key={geo} variant="secondary" className="text-xs">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {geo}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function FiltersComponent({ filters, setFilters, taxonomy, clearFilters }: {
  filters: NewsFilters;
  setFilters: React.Dispatch<React.SetStateAction<NewsFilters>>;
  taxonomy: Taxonomy;
  clearFilters: () => void;
}) {
  const { state } = useSidebar();
  
  if (state === "collapsed") {
    return null;
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Filters</span>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-8"
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Topic</label>
            <CreatableSingle
              options={taxonomy.topic}
              value={filters.topic || ''}
              onChange={(value) => setFilters(prev => ({ ...prev, topic: value || undefined }))}
              placeholder="Select topic"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <CreatableSingle
              options={taxonomy.type}
              value={filters.type || ''}
              onChange={(value) => setFilters(prev => ({ ...prev, type: value || undefined }))}
              placeholder="Select type"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Companies</label>
            <CreatableMulti
              options={taxonomy.companies}
              value={filters.companies}
              onChange={(values) => setFilters(prev => ({ ...prev, companies: values }))}
              placeholder="Select companies"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Geography</label>
            <CreatableMulti
              options={taxonomy.geography}
              value={filters.geography}
              onChange={(values) => setFilters(prev => ({ ...prev, geography: values }))}
              placeholder="Select locations"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <CreatableMulti
              options={taxonomy.tags}
              value={filters.tags}
              onChange={(values) => setFilters(prev => ({ ...prev, tags: values }))}
              placeholder="Select tags"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}