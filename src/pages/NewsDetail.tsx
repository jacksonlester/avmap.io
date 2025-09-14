import { useParams, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { StoryTypeTag, Tag } from '@/components/news/Tag';
import { Button } from '@/components/ui/button';
import { ExternalLink, Calendar, ArrowLeft } from 'lucide-react';
import { NewsItem } from '@/types/news';
import { newsDataSource } from '@/lib/notionNews';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const NewsDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadArticle = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const news = await newsDataSource.list();
        const foundArticle = news.find(item => item.slug === slug);
        
        if (foundArticle) {
          setArticle(foundArticle);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('Failed to load article:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [slug]);

  if (notFound) {
    return <Navigate to="/news" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-8">
            <Skeleton className="h-8 w-32" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="aspect-[16/9] w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return <Navigate to="/news" replace />;
  }

  const publishedDate = new Date(article.publishedAt);

  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "description": article.excerpt,
    "url": article.url,
    "datePublished": article.publishedAt,
    "publisher": {
      "@type": "Organization",
      "name": article.source
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": window.location.href
    },
    "about": article.companies.map(company => ({
      "@type": "Organization",
      "name": company
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="min-h-screen bg-background">
        <Header />
        
        <article className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mb-8 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to News
          </Button>

          {/* Article header */}
          <header className="space-y-6 mb-8">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <StoryTypeTag type={article.type} />
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <time dateTime={article.publishedAt}>
                  {format(publishedDate, "MMMM d, yyyy")}
                </time>
              </div>
              <span>•</span>
              <span className="font-medium">{article.source}</span>
            </div>

            <h1 className="text-4xl font-bold leading-tight">
              {article.title}
            </h1>

            {article.companies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {article.companies.map((company) => (
                  <Tag key={company} variant="company">
                    {company}
                  </Tag>
                ))}
              </div>
            )}
          </header>

          {/* Hero image */}
          {article.heroImage && (
            <div className="mb-8">
              <img
                src={article.heroImage}
                alt={`Hero image for ${article.title}`}
                className="w-full aspect-[16/9] object-cover rounded-lg"
              />
            </div>
          )}

          {/* Article content */}
          <div className="prose prose-gray dark:prose-invert max-w-none mb-8">
            <p className="text-lg leading-relaxed">
              {article.excerpt}
            </p>
          </div>

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Tag key={tag} variant="tag">
                    {tag}
                  </Tag>
                ))}
              </div>
            </div>
          )}

          {/* External link */}
          <div className="border-t pt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Read the full article</h3>
                <p className="text-sm text-muted-foreground">
                  Continue reading on {article.source}
                </p>
              </div>
              <Button asChild>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  Read Full Article
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </article>
      </div>
    </>
  );
};

export default NewsDetail;