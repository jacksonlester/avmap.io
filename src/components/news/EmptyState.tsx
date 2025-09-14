import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function EmptyState({ onClearFilters, hasActiveFilters }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <SearchX className="h-8 w-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">
        {hasActiveFilters ? "No articles match your filters" : "No articles found"}
      </h3>
      
      <p className="text-muted-foreground mb-6 max-w-md">
        {hasActiveFilters 
          ? "Try adjusting your search criteria or clearing some filters to see more results."
          : "We couldn't find any news articles at the moment. Please try again later."
        }
      </p>
      
      {hasActiveFilters && (
        <Button 
          variant="outline" 
          onClick={onClearFilters}
          className="focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Clear all filters
        </Button>
      )}
    </div>
  );
}