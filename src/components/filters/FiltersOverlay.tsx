import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Filter, X, RotateCcw, GripVertical } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type FiltersState = {
  companies: string[];
  statuses: string[];
  [key: string]: string | string[] | undefined;
};

export type Taxonomy = {
  topic: string[];
  companies: string[];
  geography: string[];
  tags: string[];
  type: string[];
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
  const [isMinimized, setIsMinimized] = useState(true);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Get companies from map page or news taxonomy
  const companies =
    page === "map"
      ? ["Waymo", "Tesla", "Zoox", "May Mobility"]
      : taxonomy.companies;

  const statuses = page === "map" ? ["Commercial", "Testing", "Pilot"] : [];

  const handleCompanyChange = (company: string, checked: boolean) => {
    const newCompanies = checked
      ? [...state.companies, company]
      : state.companies.filter((c) => c !== company);
    onChange({ ...state, companies: newCompanies });
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked
      ? [...state.statuses, status]
      : state.statuses.filter((s) => s !== status);
    onChange({ ...state, statuses: newStatuses });
  };

  const handleSelectAll = (type: "companies" | "statuses") => {
    if (type === "companies") {
      onChange({ ...state, companies: [...companies] });
    } else {
      onChange({ ...state, statuses: [...statuses] });
    }
  };

  const handleClearAll = (type: "companies" | "statuses") => {
    if (type === "companies") {
      onChange({ ...state, companies: [] });
    } else {
      onChange({ ...state, statuses: [] });
    }
  };

  const handleReset = () => {
    if (page === "map") {
      onChange({ companies: [...companies], statuses: [...statuses] });
    } else {
      onChange({ companies: [], statuses: [] });
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
      const headerHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--header-h"
        ) || "56"
      );

      const newX = Math.max(
        0,
        Math.min(window.innerWidth - 340, e.clientX - dragOffset.x)
      );
      const newY = Math.max(
        headerHeight + 8,
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
            <FilterContent
              companies={companies}
              statuses={statuses}
              state={state}
              onCompanyChange={handleCompanyChange}
              onStatusChange={handleStatusChange}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
              onReset={handleReset}
              page={page}
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
          top: `calc(var(--header-h) + ${position.y}px)`,
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
        width: "min(210px, 80vw)",
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10"
            >
              <RotateCcw className="h-3 w-3" />
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
        <FilterContent
          companies={companies}
          statuses={statuses}
          state={state}
          onCompanyChange={handleCompanyChange}
          onStatusChange={handleStatusChange}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearAll}
          onReset={handleReset}
          page={page}
        />
      </CardContent>
    </Card>
  );
}

interface FilterContentProps {
  companies: string[];
  statuses: string[];
  state: FiltersState;
  onCompanyChange: (company: string, checked: boolean) => void;
  onStatusChange: (status: string, checked: boolean) => void;
  onSelectAll: (type: "companies" | "statuses") => void;
  onClearAll: (type: "companies" | "statuses") => void;
  onReset: () => void;
  page: string;
}

function FilterContent({
  companies,
  statuses,
  state,
  onCompanyChange,
  onStatusChange,
  onSelectAll,
  onClearAll,
  page,
}: FilterContentProps) {
  return (
    <>
      {/* Companies */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium uppercase tracking-wide text-white/70">
            Companies
          </span>
          <div className="flex gap-2 text-xs">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectAll("companies")}
              className="h-5 px-1 text-xs text-white/60 hover:text-white"
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onClearAll("companies")}
              className="h-5 px-1 text-xs text-white/60 hover:text-white"
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          {companies.map((company) => (
            <Label
              key={company}
              htmlFor={`company-${company}`}
              className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/5 cursor-pointer"
            >
              <Checkbox
                id={`company-${company}`}
                checked={state.companies.includes(company)}
                onCheckedChange={(checked) =>
                  onCompanyChange(company, checked as boolean)
                }
                className="border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
              />
              <span className="text-sm text-white">{company}</span>
            </Label>
          ))}
        </div>
      </div>

      {/* Status (only for map page) */}
      {page === "map" && statuses.length > 0 && (
        <>
          <Separator className="bg-white/10" />
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium uppercase tracking-wide text-white/70">
                Status
              </span>
              <div className="flex gap-2 text-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectAll("statuses")}
                  className="h-5 px-1 text-xs text-white/60 hover:text-white"
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onClearAll("statuses")}
                  className="h-5 px-1 text-xs text-white/60 hover:text-white"
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              {statuses.map((status) => (
                <Label
                  key={status}
                  htmlFor={`status-${status}`}
                  className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/5 cursor-pointer"
                >
                  <Checkbox
                    id={`status-${status}`}
                    checked={state.statuses.includes(status)}
                    onCheckedChange={(checked) =>
                      onStatusChange(status, checked as boolean)
                    }
                    className="border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-black"
                  />
                  <span className="text-sm text-white">{status}</span>
                </Label>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
