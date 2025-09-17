import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { X, GripVertical, History } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Use Lucide History icon to match design language of Filter icon
const ChangeDateIcon = ({ className }: { className?: string }) => (
  <History className={className} />
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
  const [position, setPosition] = useState({ x: 76, y: 28 }); // Position to the right of button (16px left + 48px button + 12px gap)
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
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-timeline-container
                  className="fixed z-[60] h-12 w-12 rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md shadow-lg hover:bg-black/60 p-0"
                  style={{ left: "16px", bottom: "73px" }}
                >
                  <ChangeDateIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Open Timeline</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-timeline-container
              onClick={() => {
                setIsMinimized(false);
                if (onTimelineModeChange && !isTimelineMode) {
                  onTimelineModeChange(true);
                }
              }}
              className="fixed z-[60] h-12 w-12 rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md shadow-lg hover:bg-black/60 p-0"
              style={{ left: "16px", bottom: "73px" }}
            >
              <ChangeDateIcon className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Open Timeline</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
        bottom: `${120}px`, // Higher up on the page - about 120px from bottom
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

