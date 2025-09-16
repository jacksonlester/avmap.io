import { useState } from 'react';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NewsItem, Taxonomy } from '@/types/news';
import { getCurrentISOTimestamp } from '@/lib/date';
import { downloadJSON } from '@/lib/json';
import { Upload, FileText, Download, Check, AlertTriangle } from 'lucide-react';

interface ParsedRow {
  original: any;
  newsItem: Partial<NewsItem>;
  errors: string[];
  warnings: string[];
}

interface ParsedData {
  rows: ParsedRow[];
  taxonomy: Taxonomy;
  summary: {
    totalRows: number;
    validRows: number;
    duplicatesRemoved: number;
    newTaxonomyValues: Record<string, string[]>;
  };
}

interface Props {
  onCommit: (news: NewsItem[], taxonomy: Taxonomy) => void;
  currentTaxonomy: Taxonomy;
}

function parseMulti(value: string): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(/[,;]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index); // dedupe
}

function normalizeDate(value: string): string {
  if (!value || typeof value !== 'string') return '';
  
  const trimmed = value.trim();
  if (!trimmed) return '';
  
  // Try parsing as-is first
  let date = new Date(trimmed);
  
  // If invalid, try to handle US format M/D/YY or M/D/YYYY
  if (isNaN(date.getTime())) {
    const usDateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (usDateMatch) {
      let [, month, day, year] = usDateMatch;
      if (year.length === 2) {
        year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
      }
      date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
  }
  
  if (isNaN(date.getTime())) return '';
  
  // Format as YYYY-MM-DD
  return date.toISOString().split('T')[0];
}

function normalizeUrl(url: string): string {
  if (!url) return '';
  let normalized = url.toLowerCase().trim();
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  // Remove common UTM parameters
  try {
    const urlObj = new URL(normalized);
    urlObj.searchParams.delete('utm_source');
    urlObj.searchParams.delete('utm_medium');
    urlObj.searchParams.delete('utm_campaign');
    urlObj.searchParams.delete('utm_content');
    urlObj.searchParams.delete('utm_term');
    return urlObj.toString();
  } catch {
    return normalized;
  }
}

function dedupeByUrl(items: ParsedRow[]): ParsedRow[] {
  const urlMap = new Map<string, ParsedRow>();
  
  for (const item of items) {
    const url = item.newsItem.url;
    if (!url) continue;
    
    const normalizedUrl = normalizeUrl(url);
    const existing = urlMap.get(normalizedUrl);
    
    if (!existing) {
      urlMap.set(normalizedUrl, item);
    } else {
      // Keep the one with the newer date, or the last one if dates are equal/invalid
      const existingDate = existing.newsItem.date || '';
      const currentDate = item.newsItem.date || '';
      
      if (currentDate > existingDate || currentDate === existingDate) {
        urlMap.set(normalizedUrl, item);
      }
    }
  }
  
  return Array.from(urlMap.values());
}

export default function NewsCsvImport({ onCommit, currentTaxonomy }: Props) {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedResult = parseCSV(results.data as any[], currentTaxonomy);
          setParsedData(parsedResult);
        } catch (error) {
          console.error('Error parsing CSV:', error);
        } finally {
          setIsLoading(false);
        }
      },
      error: (error) => {
        console.error('Papa Parse error:', error);
        setIsLoading(false);
      }
    });

    // Reset the input
    event.target.value = '';
  };

  const parseCSV = (data: any[], currentTax: Taxonomy): ParsedData => {
    const rows: ParsedRow[] = [];
    const newTaxonomy: Taxonomy = {
      topic: [...currentTax.topic],
      companies: [...currentTax.companies],
      geography: [...currentTax.geography],
      tags: [...currentTax.tags],
      type: [...currentTax.type]
    };
    
    const newTaxonomyValues: Record<string, string[]> = {
      topic: [],
      companies: [],
      geography: [],
      tags: [],
      type: []
    };

    // Helper to add to taxonomy if not exists (case-insensitive)
    const addToTaxonomy = (category: keyof Taxonomy, value: string) => {
      if (!value) return;
      const existing = newTaxonomy[category].find(item => 
        item.toLowerCase() === value.toLowerCase()
      );
      if (!existing) {
        newTaxonomy[category].push(value);
        newTaxonomyValues[category].push(value);
      }
    };

    for (const row of data) {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Extract values (case-insensitive column matching)
      const getValue = (key: string) => {
        const foundKey = Object.keys(row).find(k => 
          k.toLowerCase() === key.toLowerCase()
        );
        return foundKey ? row[foundKey] : '';
      };

      const title = getValue('title')?.toString().trim() || '';
      const url = getValue('url')?.toString().trim() || '';
      const rawDate = getValue('date')?.toString().trim() || '';
      const summary = getValue('summary')?.toString().trim() || '';
      const topic = getValue('topic')?.toString().trim() || '';
      const companiesRaw = getValue('companies')?.toString().trim() || '';
      const geographyRaw = getValue('geography')?.toString().trim() || '';
      const tagsRaw = getValue('tags')?.toString().trim() || '';
      const type = getValue('type')?.toString().trim() || '';

      // Skip empty rows
      if (!title && !url) continue;

      // Validate required fields
      if (!title) errors.push('Missing title');
      if (!url) errors.push('Missing URL');

      // Validate URL format
      if (url) {
        try {
          new URL(url);
        } catch {
          errors.push('Invalid URL format');
        }
      }

      // Parse and validate date
      const date = normalizeDate(rawDate);
      if (rawDate && !date) {
        warnings.push('Invalid date format, left empty');
      }

      // Parse multi-value fields
      const companies = parseMulti(companiesRaw);
      const geography = parseMulti(geographyRaw);
      const tags = parseMulti(tagsRaw);

      // Add new values to taxonomy
      if (topic) addToTaxonomy('topic', topic);
      companies.forEach(c => addToTaxonomy('companies', c));
      geography.forEach(g => addToTaxonomy('geography', g));
      tags.forEach(t => addToTaxonomy('tags', t));
      if (type) addToTaxonomy('type', type);

      const newsItem: Partial<NewsItem> = {
        title,
        url,
        date,
        summary,
        topic,
        companies,
        geography,
        tags,
        type
      };

      rows.push({
        original: row,
        newsItem,
        errors,
        warnings
      });
    }

    // Deduplicate by URL
    const originalCount = rows.length;
    const deduped = dedupeByUrl(rows);
    const duplicatesRemoved = originalCount - deduped.length;

    // Create final news items
    const validRows = deduped.filter(row => row.errors.length === 0);

    return {
      rows: deduped,
      taxonomy: newTaxonomy,
      summary: {
        totalRows: originalCount,
        validRows: validRows.length,
        duplicatesRemoved,
        newTaxonomyValues
      }
    };
  };

  const handleCommit = () => {
    if (!parsedData) return;

    const validNewsItems = parsedData.rows
      .filter(row => row.errors.length === 0)
      .map(row => {
        const newsItem = row.newsItem as NewsItem;
        const now = getCurrentISOTimestamp();
        return {
          ...newsItem,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now
        };
      });

    onCommit(validNewsItems, parsedData.taxonomy);
    setParsedData(null);
  };

  const handleDownload = (type: 'news' | 'taxonomy') => {
    if (!parsedData) return;

    if (type === 'news') {
      const validNewsItems = parsedData.rows
        .filter(row => row.errors.length === 0)
        .map(row => {
          const newsItem = row.newsItem as NewsItem;
          const now = getCurrentISOTimestamp();
          return {
            ...newsItem,
            id: uuidv4(),
            createdAt: now,
            updatedAt: now
          };
        });
      downloadJSON('news.json', validNewsItems);
    } else {
      downloadJSON('taxonomy.json', parsedData.taxonomy);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import News from CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isLoading}
            className="max-w-sm"
          />
          {isLoading && <span className="text-sm text-muted-foreground">Parsing...</span>}
        </div>

        {parsedData && (
          <div className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div><strong>Import Summary:</strong></div>
                  <div>• {parsedData.summary.totalRows} rows parsed</div>
                  <div>• {parsedData.summary.validRows} valid rows (errors will be skipped)</div>
                  {parsedData.summary.duplicatesRemoved > 0 && (
                    <div>• {parsedData.summary.duplicatesRemoved} duplicates removed</div>
                  )}
                  <div>• New taxonomy values: {Object.values(parsedData.summary.newTaxonomyValues).flat().length}</div>
                </div>
              </AlertDescription>
            </Alert>

            {/* New taxonomy values */}
            {Object.entries(parsedData.summary.newTaxonomyValues).some(([, values]) => values.length > 0) && (
              <div className="space-y-2">
                <h4 className="font-medium">New Taxonomy Values:</h4>
                {Object.entries(parsedData.summary.newTaxonomyValues).map(([category, values]) => 
                  values.length > 0 && (
                    <div key={category} className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium capitalize">{category}:</span>
                      {values.map(value => (
                        <Badge key={value} variant="secondary" className="text-xs">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Preview table */}
            <div className="space-y-2">
              <h4 className="font-medium">Preview (first 10 rows):</h4>
              <ScrollArea className="h-80 border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Status</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Companies</TableHead>
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.rows.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {row.errors.length > 0 ? (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {row.newsItem.title}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {row.newsItem.url}
                        </TableCell>
                        <TableCell>{row.newsItem.date}</TableCell>
                        <TableCell>{row.newsItem.topic}</TableCell>
                        <TableCell>
                          {row.newsItem.companies?.slice(0, 2).join(', ')}
                          {(row.newsItem.companies?.length || 0) > 2 && '...'}
                        </TableCell>
                        <TableCell>
                          {[...row.errors, ...row.warnings].slice(0, 2).join(', ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap relative z-10 mt-4">
              <Button onClick={handleCommit} className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Commit to Admin State
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDownload('news')}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download news.json
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDownload('taxonomy')}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download taxonomy.json
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
