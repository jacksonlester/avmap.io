import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NewsItem } from "@/types/news";
import { StoryTypeTag, Tag } from "./Tag";
import { ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";

interface NewsCardProps {
  item: NewsItem;
}

export function NewsCard({ item }: NewsCardProps) {
  const publishedDate = new Date(item.publishedAt);
  
  return (
    <Card className="group h-full transition-all hover:shadow-md hover:shadow-primary/5 focus-within:ring-2 focus-within:ring-ring">
      <CardHeader className="p-0">
        {item.heroImage && (
          <div className="aspect-[16/9] overflow-hidden rounded-t-lg bg-muted">
            <img
              src={item.heroImage}
              alt={`Hero image for ${item.title}`}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex flex-col gap-3 p-6">
        <div className="flex items-start justify-between gap-2">
          <StoryTypeTag type={item.type} />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <time dateTime={item.publishedAt}>
              {format(publishedDate, "MMM d, yyyy")}
            </time>
          </div>
        </div>
        
        <div className="flex-1 space-y-3">
          <h3 className="line-clamp-2 text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          
          <p className="line-clamp-3 text-sm text-muted-foreground leading-relaxed">
            {item.excerpt}
          </p>
        </div>
        
        <div className="space-y-3">
          {item.companies.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.companies.map((company) => (
                <Tag key={company} variant="company">
                  {company}
                </Tag>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {item.source}
            </span>
            
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
              aria-label={`Read full article: ${item.title} (opens in new tab)`}
            >
              Read
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}