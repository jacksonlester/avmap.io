import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreatableSingle, CreatableMulti } from '@/components/ui/creatable-select';
import { downloadJSON } from '@/lib/json';
import { getCurrentISODate, getCurrentISOTimestamp } from '@/lib/date';
import { NewsItem, Taxonomy } from '@/types/news';
import { Pencil, Trash2, Download, RefreshCw, Search } from 'lucide-react';
import NewsCsvImport from '@/components/admin/NewsCsvImport';

const newsSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(160, 'Title must be at most 160 characters'),
  url: z.string().url('Must be a valid URL'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  summary: z.string().max(500, 'Summary must be at most 500 characters').optional().default(''),
  topic: z.string().min(1, 'Topic is required'),
  companies: z.array(z.string()).default([]),
  geography: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  type: z.string().min(1, 'Type is required'),
});

type NewsFormData = z.infer<typeof newsSchema>;

export default function NewsAdmin() {
  const location = useLocation();
  const isAuthorized = location.search.includes('admin=1');

  const [news, setNews] = useState<NewsItem[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({
    topic: [],
    companies: [],
    geography: [],
    tags: [],
    type: []
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<NewsFormData>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      date: getCurrentISODate(),
      summary: '',
      companies: [],
      geography: [],
      tags: [],
    }
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Save drafts to localStorage
  useEffect(() => {
    localStorage.setItem('avmap.news.draft', JSON.stringify(news));
  }, [news]);

  useEffect(() => {
    localStorage.setItem('avmap.taxonomy.draft', JSON.stringify(taxonomy));
  }, [taxonomy]);

  const loadData = async () => {
    try {
      // Check for drafts first
      const newsDraft = localStorage.getItem('avmap.news.draft');
      const taxonomyDraft = localStorage.getItem('avmap.taxonomy.draft');

      if (newsDraft && taxonomyDraft) {
        setNews(JSON.parse(newsDraft));
        setTaxonomy(JSON.parse(taxonomyDraft));
        setIsDraftLoaded(true);
      } else {
        // Load from public files
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
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const resetDrafts = () => {
    localStorage.removeItem('avmap.news.draft');
    localStorage.removeItem('avmap.taxonomy.draft');
    setIsDraftLoaded(false);
    loadData();
  };

  const updateTaxonomyWithNewValues = (formData: NewsFormData) => {
    const newTaxonomy = { ...taxonomy };

    // Add new topic if not exists
    if (formData.topic && !newTaxonomy.topic.includes(formData.topic)) {
      newTaxonomy.topic.push(formData.topic);
    }

    // Add new type if not exists
    if (formData.type && !newTaxonomy.type.includes(formData.type)) {
      newTaxonomy.type.push(formData.type);
    }

    // Add new companies
    formData.companies.forEach(company => {
      if (!newTaxonomy.companies.includes(company)) {
        newTaxonomy.companies.push(company);
      }
    });

    // Add new geography
    formData.geography.forEach(geo => {
      if (!newTaxonomy.geography.includes(geo)) {
        newTaxonomy.geography.push(geo);
      }
    });

    // Add new tags
    formData.tags.forEach(tag => {
      if (!newTaxonomy.tags.includes(tag)) {
        newTaxonomy.tags.push(tag);
      }
    });

    setTaxonomy(newTaxonomy);
  };

  const onSubmit = (formData: NewsFormData) => {
    updateTaxonomyWithNewValues(formData);

    if (editingId) {
      // Update existing
      const updatedNews = news.map(item => 
        item.id === editingId 
          ? { ...item, ...formData, updatedAt: getCurrentISOTimestamp() }
          : item
      );
      setNews(updatedNews);
      setEditingId(null);
    } else {
      // Create new
      const newItem: NewsItem = {
        id: uuidv4(),
        title: formData.title,
        url: formData.url,
        date: formData.date,
        summary: formData.summary || '',
        topic: formData.topic,
        companies: formData.companies,
        geography: formData.geography,
        tags: formData.tags,
        type: formData.type,
        createdAt: getCurrentISOTimestamp(),
        updatedAt: getCurrentISOTimestamp(),
      };
      setNews([newItem, ...news]);
    }

    reset({
      date: getCurrentISODate(),
      summary: '',
      companies: [],
      geography: [],
      tags: [],
    });
  };

  const editNews = (item: NewsItem) => {
    setEditingId(item.id);
    reset(item);
  };

  const deleteNews = (id: string) => {
    setNews(news.filter(item => item.id !== id));
  };

  const cancelEdit = () => {
    setEditingId(null);
    reset({
      date: getCurrentISODate(),
      summary: '',
      companies: [],
      geography: [],
      tags: [],
    });
  };

  const handleCsvCommit = (importedNews: NewsItem[], importedTaxonomy: Taxonomy) => {
    setNews(importedNews);
    setTaxonomy(importedTaxonomy);
  };

  const filteredNews = news.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.companies.some(c => c.toLowerCase().includes(searchTerm.toLowerCase())) ||
    item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-muted-foreground">Access Denied</h1>
          <p className="text-muted-foreground mt-2">Add ?admin=1 to the URL to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main 
        className="w-screen max-w-none" 
        style={{
          paddingTop: 'var(--header-h)', 
          height: 'calc(100vh - var(--header-h))'
        }}
      >
        <div className="h-full w-full p-4">
          {/* Top Controls */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">News Admin</h1>
              {isDraftLoaded && (
                <Alert className="w-auto">
                  <AlertDescription className="flex items-center gap-2">
                    Draft data loaded
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={resetDrafts}
                      className="ml-2"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => downloadJSON('news.json', news)}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download news.json
              </Button>
              <Button 
                variant="outline" 
                onClick={() => downloadJSON('taxonomy.json', taxonomy)}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download taxonomy.json
              </Button>
            </div>
          </div>

          {/* CSV Import Section */}
          <NewsCsvImport 
            onCommit={handleCsvCommit}
            currentTaxonomy={taxonomy}
          />

          <div className="grid h-[calc(100%-15rem)] w-full grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Form */}
            <Card className="overflow-y-auto">
              <CardHeader>
                <CardTitle>
                  {editingId ? 'Edit News Item' : 'Create News Item'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title *</label>
                    <Input {...register('title')} placeholder="Enter news title" />
                    {errors.title && (
                      <p className="text-destructive text-sm mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">URL *</label>
                    <Input {...register('url')} placeholder="https://example.com/article" />
                    {errors.url && (
                      <p className="text-destructive text-sm mt-1">{errors.url.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Date *</label>
                    <Input {...register('date')} type="date" />
                    {errors.date && (
                      <p className="text-destructive text-sm mt-1">{errors.date.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Summary</label>
                    <Textarea {...register('summary')} placeholder="Brief summary (max 500 chars)" />
                    {errors.summary && (
                      <p className="text-destructive text-sm mt-1">{errors.summary.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Topic *</label>
                    <CreatableSingle
                      options={taxonomy.topic}
                      value={watch('topic') || ''}
                      onChange={(value) => setValue('topic', value || '')}
                      placeholder="Select or create topic"
                    />
                    {errors.topic && (
                      <p className="text-destructive text-sm mt-1">{errors.topic.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Companies</label>
                    <CreatableMulti
                      options={taxonomy.companies}
                      value={watch('companies') || []}
                      onChange={(values) => setValue('companies', values)}
                      placeholder="Select or create companies"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Geography</label>
                    <CreatableMulti
                      options={taxonomy.geography}
                      value={watch('geography') || []}
                      onChange={(values) => setValue('geography', values)}
                      placeholder="Select or create locations"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Tags</label>
                    <CreatableMulti
                      options={taxonomy.tags}
                      value={watch('tags') || []}
                      onChange={(values) => setValue('tags', values)}
                      placeholder="Select or create tags"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Type *</label>
                    <CreatableSingle
                      options={taxonomy.type}
                      value={watch('type') || ''}
                      onChange={(value) => setValue('type', value || '')}
                      placeholder="Select or create type"
                    />
                    {errors.type && (
                      <p className="text-destructive text-sm mt-1">{errors.type.message}</p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingId ? 'Update' : 'Add'} News
                    </Button>
                    {editingId && (
                      <Button type="button" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Right: Table */}
            <Card className="flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center justify-between">
                  <span>Existing News ({filteredNews.length})</span>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search news..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-60"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-3">
                  {filteredNews.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium line-clamp-2">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">{item.date}</p>
                          {item.summary && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {item.summary}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editNews(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNews(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">{item.topic}</Badge>
                        <Badge variant="outline">{item.type}</Badge>
                        {item.companies.map(company => (
                          <Badge key={company} variant="default">{company}</Badge>
                        ))}
                        {item.geography.map(geo => (
                          <Badge key={geo} variant="secondary">{geo}</Badge>
                        ))}
                        {item.tags.map(tag => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}