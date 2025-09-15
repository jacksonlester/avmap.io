import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  NewsItem, 
  OPERATORS, 
  RIDER_APPS, 
  STORY_TYPES 
} from '@/types/admin';
import { AdminNewsSchema } from '@/lib/adminSchemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface NewsFormProps {
  news?: NewsItem;
  onSave: (data: NewsItem) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function NewsForm({ news, onSave, onCancel, loading }: NewsFormProps) {
  const [tags, setTags] = useState<string[]>(news?.tags || []);
  const [tagInput, setTagInput] = useState('');
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<NewsItem>({
    resolver: zodResolver(AdminNewsSchema),
    defaultValues: news || {
      id: '',
      slug: '',
      title: '',
      source: '',
      url: '',
      publishedAt: new Date().toISOString().split('T')[0],
      type: 'Announcement',
      operators: [],
      apps: [],
      tags: [],
      excerpt: '',
      status: 'published'
    }
  });

  const watchedOperators = watch('operators') || [];
  const watchedApps = watch('apps') || [];

  const toggleOperator = (operator: string) => {
    const current = watchedOperators;
    const updated = current.includes(operator as any)
      ? current.filter(o => o !== operator)
      : [...current, operator as any];
    setValue('operators', updated);
  };

  const toggleApp = (app: string) => {
    const current = watchedApps;
    const updated = current.includes(app as any)
      ? current.filter(a => a !== app)
      : [...current, app as any];
    setValue('apps', updated);
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    setValue('tags', newTags);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const onSubmit = async (data: NewsItem) => {
    await onSave({ ...data, tags });
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>
          {news ? 'Edit News Article' : 'Create News Article'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id">Article ID</Label>
              <Input
                id="id"
                {...register('id')}
                placeholder="waymo-sf-launch-2023"
                disabled={!!news}
              />
              {errors.id && (
                <p className="text-sm text-destructive">{errors.id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <div className="flex gap-2">
                <Input
                  id="slug"
                  {...register('slug')}
                  placeholder="waymo-launches-sf-service"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const title = watch('title');
                    if (title) {
                      setValue('slug', generateSlug(title));
                    }
                  }}
                >
                  Generate
                </Button>
              </div>
              {errors.slug && (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Waymo launches commercial robotaxi service in San Francisco"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Source and URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                {...register('source')}
                placeholder="TechCrunch"
              />
              {errors.source && (
                <p className="text-sm text-destructive">{errors.source.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">Article URL</Label>
              <Input
                id="url"
                type="url"
                {...register('url')}
                placeholder="https://techcrunch.com/article"
              />
              {errors.url && (
                <p className="text-sm text-destructive">{errors.url.message}</p>
              )}
            </div>
          </div>

          {/* Type and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Story Type</Label>
              <Select
                value={watch('type')}
                onValueChange={(value) => setValue('type', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select story type" />
                </SelectTrigger>
                <SelectContent>
                  {STORY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="publishedAt">Published Date</Label>
              <Input
                id="publishedAt"
                type="date"
                {...register('publishedAt')}
              />
              {errors.publishedAt && (
                <p className="text-sm text-destructive">{errors.publishedAt.message}</p>
              )}
            </div>
          </div>

          {/* Operators */}
          <div className="space-y-2">
            <Label>Related Operators</Label>
            <div className="flex flex-wrap gap-2">
              {OPERATORS.map(operator => (
                <Button
                  key={operator}
                  type="button"
                  variant={watchedOperators.includes(operator as any) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleOperator(operator)}
                >
                  {operator}
                  {watchedOperators.includes(operator as any) && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </Button>
              ))}
            </div>
            {watchedOperators.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {watchedOperators.map(operator => (
                  <Badge key={operator} variant="secondary">
                    {operator}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Apps */}
          <div className="space-y-2">
            <Label>Related Apps</Label>
            <div className="flex flex-wrap gap-2">
              {RIDER_APPS.map(app => (
                <Button
                  key={app}
                  type="button"
                  variant={watchedApps.includes(app as any) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleApp(app)}
                >
                  {app}
                  {watchedApps.includes(app as any) && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </Button>
              ))}
            </div>
            {watchedApps.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {watchedApps.map(app => (
                  <Badge key={app} variant="secondary">
                    {app}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="outline" className="cursor-pointer">
                    {tag}
                    <X 
                      className="ml-1 h-3 w-3" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              {...register('excerpt')}
              placeholder="Brief summary of the article..."
              rows={3}
            />
            {errors.excerpt && (
              <p className="text-sm text-destructive">{errors.excerpt.message}</p>
            )}
          </div>

          {/* Hero Image */}
          <div className="space-y-2">
            <Label htmlFor="heroImage">Hero Image URL (optional)</Label>
            <Input
              id="heroImage"
              type="url"
              {...register('heroImage')}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={watch('status') || 'published'}
              onValueChange={(value) => setValue('status', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}