import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CreatableSingle, CreatableMulti } from "@/components/ui/creatable-select";
import { Filter, X, RotateCcw, GripVertical, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { NewsFilters, Taxonomy } from "@/types/news";

interface FiltersBarProps {
  filters: NewsFilters;
  onChange: (filters: NewsFilters) => void;
  taxonomy: Taxonomy;
  className?: string;
}

export function FiltersBar({ filters, onChange, taxonomy, className }: FiltersBarProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const handleReset = () => {
    onChange({
      topic: undefined,
      companies: [],
      geography: [],
      tags: [],
      type: undefined,
      search: '',
    });
  };

  // Dragging functionality for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile || isMinimized) return;
    
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h') || '56');
      
      const newX = Math.max(0, Math.min(window.innerWidth - 340, e.clientX - dragOffset.x));
      const newY = Math.max(headerHeight + 8, Math.min(window.innerHeight - 400, e.clientY - dragOffset.y));
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Mobile version with Sheet
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="fixed left-4 z-[60] rounded-xl border border-white/10 bg-black/50 text-white backdrop-blur-md shadow-lg hover:bg-black/60"
            style={{ top: "calc(var(--header-h) + 12px)" }}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
            <NewsFilterContent 
              filters={filters}
              onChange={onChange}
              taxonomy={taxonomy}
              onReset={handleReset}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Minimized FAB
  if (isMinimized) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className="fixed z-[60] h-12 w-12 rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md shadow-lg hover:bg-black/60 p-0"
        style={{ 
          left: `${position.x}px`, 
          top: `calc(var(--header-h) + ${position.y}px)` 
        }}
        title="Show filters"
      >
        <Filter className="h-5 w-5" />
      </Button>
    );
  }

  // Desktop floating card
  return (
    <Card
      ref={cardRef}
      className={cn(
        "fixed z-[60] rounded-xl border border-white/10 bg-black/50 text-white backdrop-blur-md shadow-lg pointer-events-auto",
        isDragging && "cursor-grabbing",
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `calc(var(--header-h) + ${position.y}px)`,
        width: "min(340px, 92vw)",
        maxHeight: "60vh"
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <GripVertical 
              className="h-4 w-4 cursor-grab active:cursor-grabbing" 
              onMouseDown={handleMouseDown}
            />
            Filters
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 pb-3 space-y-4 overflow-y-auto max-h-[50vh]">
        <NewsFilterContent 
          filters={filters}
          onChange={onChange}
          taxonomy={taxonomy}
          onReset={handleReset}
        />
      </CardContent>
    </Card>
  );
}

interface NewsFilterContentProps {
  filters: NewsFilters;
  onChange: (filters: NewsFilters) => void;
  taxonomy: Taxonomy;
  onReset: () => void;
}

function NewsFilterContent({ filters, onChange, taxonomy }: NewsFilterContentProps) {
  return (
    <>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-white/50" />
        <Input
          placeholder="Search articles..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-8 bg-white/10 border-white/20 text-white placeholder:text-white/50"
        />
      </div>

      <Separator className="bg-white/10" />

      {/* Topic */}
      <div>
        <Label className="text-xs uppercase tracking-wide text-white/70 mb-2 block">Topic</Label>
        <CreatableSingle
          options={taxonomy.topic}
          value={filters.topic || ''}
          onChange={(value) => onChange({ ...filters, topic: value || undefined })}
          placeholder="Select topic"
        />
      </div>

      {/* Type */}
      <div>
        <Label className="text-xs uppercase tracking-wide text-white/70 mb-2 block">Type</Label>
        <CreatableSingle
          options={taxonomy.type}
          value={filters.type || ''}
          onChange={(value) => onChange({ ...filters, type: value || undefined })}
          placeholder="Select type"
        />
      </div>

      {/* Companies */}
      <div>
        <Label className="text-xs uppercase tracking-wide text-white/70 mb-2 block">Companies</Label>
        <CreatableMulti
          options={taxonomy.companies}
          value={filters.companies}
          onChange={(values) => onChange({ ...filters, companies: values })}
          placeholder="Select companies"
        />
      </div>

      {/* Geography */}
      <div>
        <Label className="text-xs uppercase tracking-wide text-white/70 mb-2 block">Geography</Label>
        <CreatableMulti
          options={taxonomy.geography}
          value={filters.geography}
          onChange={(values) => onChange({ ...filters, geography: values })}
          placeholder="Select locations"
        />
      </div>

      {/* Tags */}
      <div>
        <Label className="text-xs uppercase tracking-wide text-white/70 mb-2 block">Tags</Label>
        <CreatableMulti
          options={taxonomy.tags}
          value={filters.tags}
          onChange={(values) => onChange({ ...filters, tags: values })}
          placeholder="Select tags"
        />
      </div>
    </>
  );
}