import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Filter, X, RotateCcw, GripVertical, Info, Building2, Smartphone, Shield, Users, DollarSign, MousePointer } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { COMPANY_COLORS } from "@/types";

export type FiltersState = {
  companies: string[];
  platform: string[];
  supervision: string[];
  access: string[];
  fares: string[];
  directBooking: string[];
  [key: string]: string | string[] | undefined;
};

export type Taxonomy = {
  companies: string[];
  platform: string[];
  supervision: string[];
  access: string[];
  fares: string[];
  directBooking: string[];
};

interface FiltersOverlayProps {
  page: "map" | "news" | "cities" | "companies";
  taxonomy: Taxonomy;
  state: FiltersState;
  onChange: (next: FiltersState) => void;
  className?: string;
}

export function FiltersOverlay({
  page,
  taxonomy,
  state,
  onChange,
  className,
}: FiltersOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 73 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Define filter options for map page
  const filterOptions = page === "map" ? {
    companies: ["Waymo", "Tesla", "Zoox", "May Mobility"],
    platform: ["Waymo", "Uber", "Lyft", "Robotaxi", "Zoox"],
    supervision: ["Autonomous", "Safety Driver", "Safety Attendant"],
    access: ["Public", "Waitlist"],
    fares: ["Yes", "No"],
    directBooking: ["Yes", "No"]
  } : {
    companies: taxonomy.companies,
    platform: taxonomy.platform,
    supervision: taxonomy.supervision,
    access: taxonomy.access,
    fares: taxonomy.fares,
    directBooking: taxonomy.directBooking
  };

  // Generic filter handlers
  const handleFilterChange = (filterType: keyof FiltersState, value: string, checked: boolean) => {
    const currentValues = state[filterType] as string[];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter((v) => v !== value);
    onChange({ ...state, [filterType]: newValues });
  };

  const handleSelectAll = (filterType: keyof FiltersState) => {
    const options = filterOptions[filterType as keyof typeof filterOptions];
    if (options) {
      onChange({ ...state, [filterType]: [...options] });
    }
  };

  const handleClearAll = (filterType: keyof FiltersState) => {
    onChange({ ...state, [filterType]: [] });
  };

  const handleReset = () => {
    if (page === "map") {
      const resetState: Partial<FiltersState> = {};
      Object.keys(filterOptions).forEach(key => {
        const filterKey = key as keyof typeof filterOptions;
        // Set fares and directBooking to both options selected by default
        if (filterKey === 'fares' || filterKey === 'directBooking') {
          resetState[filterKey] = [...filterOptions[filterKey]];
        } else {
          resetState[filterKey] = [...filterOptions[filterKey]];
        }
      });
      onChange({ ...state, ...resetState });
    } else {
      const resetState: Partial<FiltersState> = {};
      Object.keys(filterOptions).forEach(key => {
        resetState[key as keyof FiltersState] = [];
      });
      onChange({ ...state, ...resetState });
    }
  };

  // Dragging functionality for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile || isMinimized) return;

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(
        0,
        Math.min(window.innerWidth - 340, e.clientX - dragOffset.x)
      );
      const newY = Math.max(
        73, // Keep 73px from top
        Math.min(window.innerHeight - 400, e.clientY - dragOffset.y)
      );

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Mobile version with Sheet
  if (isMobile) {
    return (
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="fixed left-4 z-[100] rounded-xl border border-white/10 bg-black/50 text-white backdrop-blur-md shadow-lg hover:bg-black/60 touch-manipulation"
            style={{
              top: "73px",
              display: isSheetOpen ? 'none' : 'flex'
            }}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0 bg-background text-foreground flex flex-col h-full">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-6 flex-1 overflow-y-auto">
            <FilterContent
              filterOptions={filterOptions}
              state={state}
              onFilterChange={handleFilterChange}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
              onReset={handleReset}
              page={page}
              isMobile={true}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Minimized FAB
  if (isMinimized) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="fixed z-[60] flex flex-col items-center gap-1" style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
            }}>
              {/* Filter FAB */}
              <Button
                onClick={() => setIsMinimized(false)}
                className="h-12 w-12 rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md shadow-lg hover:bg-black/60 p-0 relative"
              >
                <Filter className="h-5 w-5" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Open Filters</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Desktop floating card
  return (
    <Card
      ref={cardRef}
      className={cn(
        "fixed z-[60] rounded-xl border border-white/10 bg-black/50 text-white backdrop-blur-md shadow-xl pointer-events-auto",
        isDragging && "cursor-grabbing",
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: "min(340px, 90vw)",
        maxHeight: "60vh",
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
            <TooltipProvider delayDuration={500}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-6 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Reset all</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={500}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(true)}
                    className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Close Filters</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-3 space-y-3 overflow-y-auto max-h-[48vh]">
        <FilterContent
          filterOptions={filterOptions}
          state={state}
          onFilterChange={handleFilterChange}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearAll}
          onReset={handleReset}
          page={page}
          isMobile={false}
        />
      </CardContent>
    </Card>
  );
}

interface FilterContentProps {
  filterOptions: Record<string, string[]>;
  state: FiltersState;
  onFilterChange: (filterType: keyof FiltersState, value: string, checked: boolean) => void;
  onSelectAll: (filterType: keyof FiltersState) => void;
  onClearAll: (filterType: keyof FiltersState) => void;
  onReset: () => void;
  page: string;
  isMobile?: boolean;
}

// Filter metadata with tooltips and icons
const getFilterMetadata = (isMobile: boolean) => ({
  companies: {
    label: "Company",
    tooltip: "The company providing the autonomous vehicle technology.",
    icon: Building2
  },
  platform: {
    label: isMobile ? "Platform" : "Booking Platform",
    tooltip: "The app platform where riders can access the service",
    icon: Smartphone
  },
  supervision: {
    label: "Supervision",
    tooltip: "Whether the vehicle has a safety driver, safety attendant, or operates fully autonomously",
    icon: Shield
  },
  access: {
    label: "Availability",
    tooltip: "Who can ride the service",
    icon: Users
  },
  fares: {
    label: "Fares?",
    tooltip: "Whether the service charges fares",
    icon: DollarSign
  },
  directBooking: {
    label: isMobile ? "Direct Booking?" : "Direct\nBooking?",
    tooltip: "Whether riders can request an AV directly or only receive one by chance through a larger fleet",
    icon: MousePointer
  }
});

function FilterContent({
  filterOptions,
  state,
  onFilterChange,
  onSelectAll,
  onClearAll,
  page,
  isMobile = false,
}: FilterContentProps) {
  const FILTER_METADATA = getFilterMetadata(isMobile);

  const renderFilterSection = (filterKey: keyof FiltersState) => {
    const options = filterOptions[filterKey];
    const metadata = FILTER_METADATA[filterKey];
    if (!options || !metadata) return null;

    // Binary options (Yes/No) - no All/Clear buttons needed
    const isBinaryOption = options.length === 2 && options.includes('Yes') && options.includes('No');
    // Also treat supervision and access as binary-like (no All/Clear buttons)
    const shouldHideAllClear = isBinaryOption || filterKey === 'supervision' || filterKey === 'access';

    // Determine grid layout
    let gridCols = 'grid-cols-1';
    if (filterKey === 'companies' || filterKey === 'platform') {
      gridCols = 'grid-cols-2';
    } else if (filterKey === 'supervision') {
      gridCols = 'grid-cols-1';
    }

    return (
      <div key={filterKey} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <metadata.icon className={`h-3 w-3 ${isMobile ? 'text-muted-foreground' : 'text-white/60'}`} />
                  <span className={`text-xs font-medium uppercase tracking-wide ${isMobile ? 'text-muted-foreground' : 'text-white/70'}`}>
                    {metadata.label}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">{metadata.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {!shouldHideAllClear && !isMobile && (
            <div className="flex gap-1">
              <TooltipProvider delayDuration={500}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectAll(filterKey)}
                      className={`h-5 px-2 text-xs rounded-md transition-colors ${isMobile ? 'text-muted-foreground hover:text-foreground hover:bg-accent' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                    >
                      All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Select All</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={500}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onClearAll(filterKey)}
                      className={`h-5 px-2 text-xs rounded-md transition-colors ${isMobile ? 'text-muted-foreground hover:text-foreground hover:bg-accent' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                    >
                      Clear
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Clear All</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
        <div className={`grid gap-1 ${gridCols}`}>
          {options.map((option) => (
            <Label
              key={option}
              htmlFor={`${filterKey}-${option}`}
              className={`flex items-center gap-1.5 py-1 px-1.5 rounded cursor-pointer ${isMobile ? 'hover:bg-accent' : 'hover:bg-white/5'}`}
            >
              <Checkbox
                id={`${filterKey}-${option}`}
                checked={(state[filterKey] as string[]).includes(option)}
                onCheckedChange={(checked) =>
                  onFilterChange(filterKey, option, checked as boolean)
                }
                className="border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
              />
              <div className="flex items-center gap-1 flex-1 min-w-0">
                {filterKey === 'companies' && COMPANY_COLORS[option] && (
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COMPANY_COLORS[option].color }}
                  />
                )}
                <span className={`text-xs ${isMobile ? 'text-foreground' : 'text-white'}`}>
                  {option}
                </span>
              </div>
            </Label>
          ))}
        </div>
      </div>
    );
  };


  return (
    <TooltipProvider>
      <div className="space-y-3">
        {page === "map" && (
          <>
            {/* Company and Platform filters */}
            {['companies', 'platform'].map((key, index) => (
              <div key={key}>
                {renderFilterSection(key as keyof FiltersState)}
                {index < 1 && <Separator className="bg-white/10 mt-3" />}
              </div>
            ))}

            <Separator className="bg-white/10" />

            {/* Supervision and Availability in 2 columns */}
            <div className="grid grid-cols-2 gap-3">
              <div>{renderFilterSection('supervision')}</div>
              <div>{renderFilterSection('access')}</div>
            </div>

            <Separator className="bg-white/10" />

            {/* Fares and Direct Booking in 2 columns */}
            <div className="grid grid-cols-2 gap-3">
              {['fares', 'directBooking'].map((filterKey) => {
                const options = filterOptions[filterKey];
                const metadata = FILTER_METADATA[filterKey];
                if (!options || !metadata) return null;

                return (
                  <div key={filterKey} className="space-y-1">
                    <TooltipProvider delayDuration={500}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-start gap-1 cursor-help">
                            <div className="flex items-center gap-1">
                              <metadata.icon className={`h-3 w-3 ${isMobile ? 'text-muted-foreground' : 'text-white/60'}`} />
                              <span className={`text-xs font-medium uppercase tracking-wide leading-tight ${isMobile ? 'text-muted-foreground' : 'text-white/70'}`}>
                                {metadata.label}
                              </span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">{metadata.tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="flex flex-col gap-1">
                      {options.map((option) => (
                        <Label
                          key={option}
                          htmlFor={`${filterKey}-${option}`}
                          className={`flex items-center gap-1.5 py-1 px-1.5 rounded cursor-pointer ${isMobile ? 'hover:bg-accent' : 'hover:bg-white/5'}`}
                        >
                          <Checkbox
                            id={`${filterKey}-${option}`}
                            checked={(state[filterKey] as string[]).includes(option)}
                            onCheckedChange={(checked) =>
                              onFilterChange(filterKey, option, checked as boolean)
                            }
                            className="border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
                          />
                          <span className={`text-xs ${isMobile ? 'text-foreground' : 'text-white'}`}>{option}</span>
                        </Label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
