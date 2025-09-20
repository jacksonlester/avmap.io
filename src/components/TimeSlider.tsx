import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  const [isMinimized, setIsMinimized] = useState(false);
  // Position 73px from bottom
  const [position, setPosition] = useState({ x: 16, y: 73 });
  const [isPanelDragging, setIsPanelDragging] = useState(false);
  const [isTimelineDragging, setIsTimelineDragging] = useState(false);
  const [isMobileTouchDragging, setIsMobileTouchDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const mobileTimelineRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const lastUpdateRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  // Sync internal minimized state with external timeline mode
  useEffect(() => {
    setIsMinimized(!isTimelineMode);
  }, [isTimelineMode]);

  // Convert dates to slider values (0-100)
  const totalDuration = endDate.getTime() - startDate.getTime();
  const currentProgress =
    ((currentDate.getTime() - startDate.getTime()) / totalDuration) * 100;

  const handleSliderChange = (value: number[]) => {
    const newTimestamp = startDate.getTime() + (value[0] / 100) * totalDuration;
    onDateChange(new Date(newTimestamp));
  };

  // Handle mouse events for YouTube-style dragging
  const handleTimelineClick = (e: React.MouseEvent | MouseEvent) => {
    if (!timelineRef.current) return;

    // Always get fresh rect for accurate positioning
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const newTimestamp = startDate.getTime() + (percentage / 100) * totalDuration;
    const newDate = new Date(newTimestamp);

    // Clamp date to not exceed today
    const today = new Date();
    const clampedDate = newDate > today ? today : newDate;

    onDateChange(clampedDate);
  };

  // Optimized mobile touch handler
  const handleMobileTimelineUpdate = useCallback((clientX: number) => {
    if (!mobileTimelineRef.current) return;

    const rect = mobileTimelineRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const newTimestamp = startDate.getTime() + (percentage / 100) * totalDuration;
    const newDate = new Date(newTimestamp);

    // Clamp date to not exceed today
    const today = new Date();
    const clampedDate = newDate > today ? today : newDate;

    // Throttle updates using requestAnimationFrame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      onDateChange(clampedDate);
    });
  }, [startDate, totalDuration, onDateChange]);

  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent panel dragging
    setIsTimelineDragging(true);
    handleTimelineClick(e);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent) => {
    // Mouse move is now handled globally for better responsiveness
    return;
  };

  const handleTimelineMouseUp = () => {
    setIsTimelineDragging(false);
  };

  // Global mouse listeners for smooth timeline dragging
  useEffect(() => {
    if (!isTimelineDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Direct call without throttling for immediate response
      handleTimelineClick(e);
    };

    const handleGlobalMouseUp = () => {
      setIsTimelineDragging(false);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isTimelineDragging]);

  // Card dragging functionality for desktop positioning
  const handleCardMouseDown = (e: React.MouseEvent) => {
    if (isMobile || isMinimized) return;

    // Only start dragging if clicking the grip handle specifically
    const target = e.target as HTMLElement;
    if (!target.closest("[data-grip-handle]")) {
      return;
    }

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsPanelDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: window.innerHeight - e.clientY - position.y,
    });
  };

  useEffect(() => {
    if (!isPanelDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(
        0,
        Math.min(window.innerWidth - 320, e.clientX - dragOffset.x)
      );
      const newY = Math.max(
        73, // Keep 73px from bottom
        Math.min(
          window.innerHeight - 150, // Leave space at top
          window.innerHeight - e.clientY - dragOffset.y
        )
      );

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsPanelDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanelDragging, dragOffset]);

  // Mobile version with Sheet - controlled externally via isTimelineMode
  if (isMobile) {
    return (
      <Sheet
        open={true}
        onOpenChange={() => {
          // Always keep open on mobile
        }}
        modal={false}
      >
        <SheetContent side="bottom" className="h-20 p-0 [&>button]:hidden">
          <div className="p-2 space-y-1">
            {/* Top row: Current date title */}
            <div className="text-center">
              <span className="text-sm font-medium">
                {currentDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>


            {/* YouTube-style timeline slider for mobile */}
            <div className="relative px-3">
              <div className="relative group/timeline">
                <div
                  ref={mobileTimelineRef}
                  className="relative h-6 flex items-center cursor-pointer"
                  onClick={(e) => {
                    if (!mobileTimelineRef.current) return;
                    const rect = mobileTimelineRef.current.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
                    const newTimestamp = startDate.getTime() + (percentage / 100) * totalDuration;
                    const newDate = new Date(newTimestamp);
                    const today = new Date();
                    const clampedDate = newDate > today ? today : newDate;
                    onDateChange(clampedDate);
                  }}
                  onTouchStart={(e) => {
                    setIsMobileTouchDragging(true);
                    const touch = e.touches[0];
                    handleMobileTimelineUpdate(touch.clientX);
                  }}
                  onTouchMove={(e) => {
                    if (isMobileTouchDragging) {
                      const touch = e.touches[0];
                      handleMobileTimelineUpdate(touch.clientX);
                    }
                  }}
                  onTouchEnd={() => {
                    setIsMobileTouchDragging(false);
                  }}
                >
                  {/* Track background */}
                  <div className="w-full h-1 bg-muted rounded-full group-hover/timeline:h-1.5 transition-all">
                    {/* Progress bar */}
                    <div
                      className="h-full bg-primary rounded-full relative transition-all"
                      style={{ width: `${currentProgress}%` }}
                    />
                  </div>

                  {/* Scrubber handle */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 transition-all"
                    style={{ left: `${currentProgress}%` }}
                  >
                    <div className="w-3 h-3 bg-primary rounded-full shadow-lg transition-all group-hover/timeline:w-4 group-hover/timeline:h-4" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // No standalone button - timeline is opened via the date chip
  if (isMinimized) {
    return null;
  }

  // Desktop floating card - simplified timeline
  return (
    <Card
      ref={cardRef}
      data-timeline-container
      className={cn(
        "fixed z-[59] rounded-xl border border-white/10 bg-black/50 text-white backdrop-blur-md shadow-lg pointer-events-auto",
        isPanelDragging && "cursor-grabbing",
        className
      )}
      style={{
        left: `${position.x}px`,
        bottom: `${position.y}px`, // Position 73px from bottom
        width: "min(320px, 90vw)",
        height: "auto",
      }}
    >
      <CardContent className="px-4 py-3 space-y-3">
        {/* Top row: Drag handle, title, and close button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical
              data-grip-handle
              className="h-4 w-4 text-white/50 hover:text-white cursor-grab active:cursor-grabbing"
              onMouseDown={handleCardMouseDown}
            />
            <span className="text-sm font-medium text-white">
              {currentDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
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


        {/* YouTube-style timeline slider */}
        <div className="relative">
          <div
            ref={timelineRef}
            className="relative group/timeline"
          >
            <div
              className={`relative h-4 flex items-center select-none ${isTimelineDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
              onMouseDown={handleTimelineMouseDown}
              onMouseMove={handleTimelineMouseMove}
              onMouseUp={handleTimelineMouseUp}
              onClick={!isTimelineDragging ? handleTimelineClick : undefined}
            >
              {/* Track background - thinner for main timeline */}
              <div className="w-full h-0.5 bg-white/20 rounded-full group-hover/timeline:h-1 transition-all">
                {/* Progress bar */}
                <div
                  className="h-full bg-white rounded-full relative transition-all"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>

              {/* Scrubber handle - smaller and on top for main timeline */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 transition-all ${isTimelineDragging ? 'scale-110' : ''}`}
                style={{ left: `${currentProgress}%` }}
              >
                <div className={`w-2.5 h-2.5 bg-white rounded-full shadow-lg transition-all group-hover/timeline:w-3 group-hover/timeline:h-3 ${isTimelineDragging ? 'scale-110' : ''}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row: Start date and Today button */}
        <div className="flex items-center justify-between text-xs text-white/70">
          <span className="whitespace-nowrap">
            {startDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDateChange(endDate)}
            className="text-xs text-white/70 hover:text-white hover:bg-white/10 px-0 py-1 h-auto"
          >
            Today
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
