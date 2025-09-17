import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { X, GripVertical } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Change date icon component - calendar with circular refresh arrows
const ChangeDateIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Calendar base */}
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    {/* Calendar grid dots */}
    <circle cx="8" cy="14" r="0.5" fill="currentColor"/>
    <circle cx="12" cy="14" r="0.5" fill="currentColor"/>
    <circle cx="16" cy="14" r="0.5" fill="currentColor"/>
    <circle cx="8" cy="18" r="0.5" fill="currentColor"/>
    <circle cx="12" cy="18" r="0.5" fill="currentColor"/>
    <circle cx="16" cy="18" r="0.5" fill="currentColor"/>
    {/* Circular refresh arrows around calendar */}
    <path d="M1 12a11 11 0 0 1 18-8.5" strokeWidth="1.5"/>
    <path d="M23 12a11 11 0 0 1-18 8.5" strokeWidth="1.5"/>
    <polyline points="15,2 19,3.5 17.5,7.5" strokeWidth="1.5" fill="currentColor"/>
    <polyline points="9,22 5,20.5 6.5,16.5" strokeWidth="1.5" fill="currentColor"/>
  </svg>
);

interface TimeSliderProps {
  startDate: Date;
  endDate: Date;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  isTimelineMode?: boolean;
  onTimelineModeChange?: (enabled: boolean) => void;
  className?: string;
}

export function TimeSlider({
  startDate,
  endDate,
  currentDate,
  onDateChange,
  isTimelineMode = false,
  onTimelineModeChange,
  className,
}: TimeSliderProps) {
  const [isMinimized, setIsMinimized] = useState(true);
  const [position, setPosition] = useState({ x: 16, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Convert dates to slider values (0-100)
  const totalDuration = endDate.getTime() - startDate.getTime();
  const currentProgress = ((currentDate.getTime() - startDate.getTime()) / totalDuration) * 100;

  const handleSliderChange = (value: number[]) => {
    const newTimestamp = startDate.getTime() + (value[0] / 100) * totalDuration;
    onDateChange(new Date(newTimestamp));
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
        Math.min(window.innerWidth - 600, e.clientX - dragOffset.x)
      );
      const newY = Math.max(
        24,
        Math.min(window.innerHeight - 100, window.innerHeight - (e.clientY - dragOffset.y))
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
            data-timeline-container
            className="fixed bottom-3 left-4 z-[60] h-12 w-12 rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md shadow-lg hover:bg-black/60 p-0"
            title="Show timeline"
          >
            <ChangeDateIcon className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-32 p-0">
          <div className="p-4">
            <div className="flex items-center gap-4">
              {/* Start date */}
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Oct 8, 2020
              </span>

              {/* Timeline slider with traveling date */}
              <div className="flex-1 relative">
                <Slider
                  value={[currentProgress]}
                  onValueChange={handleSliderChange}
                  max={100}
                  step={0.1}
                  className="w-full"
                />
                {/* Traveling date indicator */}
                <div
                  className="absolute -top-8 transform -translate-x-1/2 pointer-events-none z-10"
                  style={{ left: `${currentProgress}%` }}
                >
                  <span className="text-xs text-foreground bg-background/90 px-2 py-1 rounded whitespace-nowrap shadow-lg border">
                    {currentDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Clickable Today button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDateChange(endDate)}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 h-auto"
              >
                Today
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Minimized FAB - positioned at bottom left, styled like filter button
  if (isMinimized) {
    return (
      <Button
        data-timeline-container
        onClick={() => {
          setIsMinimized(false);
          if (onTimelineModeChange && !isTimelineMode) {
            onTimelineModeChange(true);
          }
        }}
        className="fixed bottom-3 left-4 z-[60] h-12 w-12 rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md shadow-lg hover:bg-black/60 p-0"
        title="Show timeline"
      >
        <ChangeDateIcon className="h-5 w-5" />
      </Button>
    );
  }

  // Desktop floating card - simplified timeline
  return (
    <Card
      ref={cardRef}
      data-timeline-container
      className={cn(
        "fixed z-[60] rounded-xl border border-white/10 bg-black/50 text-white backdrop-blur-md shadow-lg pointer-events-auto",
        isDragging && "cursor-grabbing",
        className
      )}
      style={{
        left: `${position.x}px`,
        bottom: `${position.y}px`,
        width: "min(600px, 90vw)",
        height: "auto",
      }}
    >
      <CardContent className="px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Drag handle */}
          <GripVertical
            className="h-4 w-4 cursor-grab active:cursor-grabbing text-white/50 hover:text-white"
            onMouseDown={handleMouseDown}
          />

          {/* Start date */}
          <span className="text-xs text-white/70 whitespace-nowrap">
            Oct 8, 2020
          </span>

          {/* Timeline slider with traveling date */}
          <div className="flex-1 relative">
            <Slider
              value={[currentProgress]}
              onValueChange={handleSliderChange}
              max={100}
              step={0.1}
              className="w-full"
            />
            {/* Traveling date indicator - positioned based on slider progress */}
            <div
              className="absolute -top-8 transform -translate-x-1/2 pointer-events-none z-10"
              style={{ left: `${currentProgress}%` }}
            >
              <span className="text-xs text-white bg-black/90 px-2 py-1 rounded whitespace-nowrap shadow-lg">
                {currentDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          {/* Clickable Today button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDateChange(endDate)}
            className="text-xs text-white/70 hover:text-white hover:bg-white/10 px-2 py-1 h-auto"
          >
            Today
          </Button>

          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsMinimized(true);
              if (onTimelineModeChange) {
                onTimelineModeChange(false);
              }
            }}
            className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

