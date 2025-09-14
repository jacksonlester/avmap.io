import { useState } from "react";
import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { StoryType, NewsFilters } from "@/types/news";
import { cn } from "@/lib/utils";

interface FiltersProps {
  filters: NewsFilters;
  onFiltersChange: (filters: NewsFilters) => void;
  availableCompanies: string[];
  className?: string;
}

const STORY_TYPES: StoryType[] = [
  "Announcement", "Launch", "Partnership", "Funding", 
  "Analysis", "Regulatory", "Safety", "Other"
];

export function Filters({ filters, onFiltersChange, availableCompanies, className }: FiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const hasActiveFilters = filters.types.length > 0 || filters.companies.length > 0 || filters.search.length > 0;
  
  const clearFilters = () => {
    onFiltersChange({
      types: [],
      companies: [],
      search: ""
    });
  };

  const updateFilters = (key: keyof NewsFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <div className={cn("border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container mx-auto px-4 py-4">
        {/* Mobile toggle button */}
        <div className="flex items-center justify-between md:hidden mb-4">
          <h2 className="text-lg font-semibold">Filters</h2>
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>

        {/* Search bar - always visible */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={filters.search}
            onChange={(e) => updateFilters("search", e.target.value)}
            className="pl-9 pr-9"
            aria-label="Search articles by title, excerpt, or source"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateFilters("search", "")}
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-transparent"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filter content - collapsible on mobile, always visible on desktop */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="md:block">
          <CollapsibleContent className="space-y-4 md:space-y-0 md:block">
            <div className="space-y-4 md:space-y-6">
              {/* Story Types */}
              <div>
                <label className="text-sm font-medium mb-3 block">
                  Story Type
                </label>
                <ToggleGroup
                  type="multiple"
                  value={filters.types}
                  onValueChange={(value) => updateFilters("types", value)}
                  className="flex-wrap justify-start gap-2"
                  aria-label="Filter by story type"
                >
                  {STORY_TYPES.map((type) => (
                    <ToggleGroupItem
                      key={type}
                      value={type}
                      size="sm"
                      className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      {type}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {/* Companies */}
              <div>
                <label className="text-sm font-medium mb-3 block">
                  Company
                </label>
                <ToggleGroup
                  type="multiple"
                  value={filters.companies}
                  onValueChange={(value) => updateFilters("companies", value)}
                  className="flex-wrap justify-start gap-2"
                  aria-label="Filter by company"
                >
                  {availableCompanies.map((company) => (
                    <ToggleGroupItem
                      key={company}
                      value={company}
                      size="sm"
                      className="data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground"
                    >
                      {company}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear all
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}