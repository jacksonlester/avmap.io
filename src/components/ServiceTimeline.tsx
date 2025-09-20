import { useState, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Smartphone,
  Shield,
  Users,
  DollarSign,
  MousePointer,
  Car,
  MapPin,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ServiceEvent {
  date: Date;
  type: string;
  description: string;
  details?: string;
}

interface ServiceTimelineProps {
  serviceId: string;
  serviceName: string;
  startDate: Date;
  endDate: Date;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  events: ServiceEvent[];
  className?: string;
}

// Event type to icon mapping (same icons as BottomSheet)
const EVENT_ICONS = {
  service_created: MapPin,
  service_updated: MapPin,
  service_ended: MapPin,
  fares_policy_changed: DollarSign,
  access_policy_changed: Users,
  vehicle_types_updated: Car,
  platform_updated: Smartphone,
  supervision_updated: Shield,
  geometry_updated: MapPin,
  // CSV event types
  "Service Area Change": MapPin,
  "Access Change": Users,
  "Fares Change": DollarSign,
  "Vehicle Change": Car,
  "Supervision Change": Shield,
};

export function ServiceTimeline({
  serviceId,
  serviceName,
  startDate,
  endDate,
  currentDate,
  onDateChange,
  events,
  className,
}: ServiceTimelineProps) {
  const DEBUG = false; // Debug mode toggle
  const isMobile = useIsMobile();
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [touchStartPosition, setTouchStartPosition] = useState<{ x: number; y: number } | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  // Convert dates to slider values (0-100)
  const totalDuration = endDate.getTime() - startDate.getTime();
  const currentProgress =
    ((currentDate.getTime() - startDate.getTime()) / totalDuration) * 100;

  const handleSliderChange = (value: number[]) => {
    const newTimestamp = startDate.getTime() + (value[0] / 100) * totalDuration;
    onDateChange(new Date(newTimestamp));
  };

  // Handle mouse and touch events for dragging
  const handleTimelineClick = (e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) => {
    if (!timelineRef.current) return;

    // Cache the rect at the start of dragging for better performance
    const rect = timelineRef.current.getBoundingClientRect();

    // Get X coordinate from either mouse or touch event
    const clientX = 'touches' in e
      ? e.touches[0]?.clientX || e.changedTouches?.[0]?.clientX
      : e.clientX;

    if (clientX === undefined) return;

    // Calculate relative position within the timeline
    const relativeX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));

    // Directly calculate new timestamp without intermediate date conversion
    const newTimestamp = startDate.getTime() + (percentage / 100) * totalDuration;

    // Clamp to not exceed today
    const today = new Date();
    const maxTimestamp = today.getTime();
    const clampedTimestamp = Math.min(newTimestamp, maxTimestamp);

    onDateChange(new Date(clampedTimestamp));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setOpenTooltip(null); // Close any open tooltips when dragging starts
    handleTimelineClick(e);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartTime(Date.now());
    setTouchStartPosition({ x: touch.clientX, y: touch.clientY });
    setOpenTooltip(null); // Close any open tooltips initially

    // Don't start dragging immediately - wait to see if it's a hold or drag
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Mouse move is now handled globally for better responsiveness
    return;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosition) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPosition.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosition.y);
    const totalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // If they've moved more than 10px, it's a drag - start dragging mode
    if (totalDistance > 10 && !isDragging) {
      e.preventDefault(); // Prevent scrolling once we detect dragging
      setIsDragging(true);
      handleTimelineClick(e);
    } else if (isDragging) {
      e.preventDefault(); // Continue preventing scroll during drag
      handleTimelineClick(e);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchDuration = Date.now() - touchStartTime;
    const wasStationary = !isDragging;

    if (wasStationary && touchDuration >= 500) {
      // Long press (500ms+) without movement - this is for tooltips on event markers
      // The tooltip logic will be handled by individual event markers
    } else if (wasStationary && touchDuration < 500) {
      // Quick tap - jump to position
      handleTimelineClick(e);
    }

    // Reset states
    setIsDragging(false);
    setTouchStartTime(0);
    setTouchStartPosition(null);
  };

  // Global mouse and touch listeners for smooth timeline dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Direct call without throttling for immediate response
      handleTimelineClick(e);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling while dragging
      handleTimelineClick(e);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    const handleGlobalTouchEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging]);

  // Group events by date and handle overlapping icons
  const groupedEvents = events.reduce((acc, event) => {
    const dateKey = event.date.toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, ServiceEvent[]>);

  // Create positioned event groups with offset handling
  const positionedEventGroups = Object.entries(groupedEvents).map(([dateKey, eventGroup]) => {
    const firstEvent = eventGroup[0];
    const eventProgress = ((firstEvent.date.getTime() - startDate.getTime()) / totalDuration) * 100;
    return {
      dateKey,
      events: eventGroup,
      progress: eventProgress,
      date: firstEvent.date,
    };
  });

  // Sort by progress to handle overlaps
  positionedEventGroups.sort((a, b) => a.progress - b.progress);

  // Enhanced spacing algorithm to prevent overlaps
  const finalPositionedGroups = (() => {
    // Calculate minimum distance based on timeline width (responsive)
    const minDistancePercent = 2.5; // 2.5% minimum distance between markers

    // Sort by progress to handle overlaps sequentially
    const sorted = [...positionedEventGroups].sort((a, b) => a.progress - b.progress);

    // Adjust positions to prevent overlaps
    const adjusted: Array<any> = [];

    for (let index = 0; index < sorted.length; index++) {
      const group = sorted[index];
      let adjustedProgress = group.progress;

      // Check against all previous groups
      for (let i = 0; i < adjusted.length; i++) {
        const prevGroup = adjusted[i];
        const distance = Math.abs(adjustedProgress - prevGroup.progress);

        if (distance < minDistancePercent) {
          // Push this marker to the right of the previous one
          adjustedProgress = prevGroup.progress + minDistancePercent;
        }
      }

      // Don't let markers go beyond 95% to keep them visible
      adjustedProgress = Math.min(adjustedProgress, 95);

      adjusted.push({
        ...group,
        progress: adjustedProgress,
        originalProgress: group.progress, // Keep original for tooltip reference
      });
    }

    return adjusted;
  })();

  return (
    <div className={`space-y-3 ${className}`}>
        {/* YouTube-style Timeline */}
        <div className="relative flex items-center gap-3 pt-2">
          {/* Start date */}
          <div className="text-xs text-white/60 whitespace-nowrap flex-shrink-0 text-center min-w-[3rem]">
            <div>{startDate.toLocaleDateString("en-US", { month: "short" })}</div>
            <div>{startDate.getFullYear()}</div>
          </div>

          {/* Timeline container - YouTube style */}
          <div
            ref={timelineRef}
            className="flex-1 relative group/timeline"
          >
            {/* Clickable track area */}
            <div
              className={`relative h-6 flex items-center select-none ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={!isDragging ? handleTimelineClick : undefined}
            >
              {/* Track background */}
              <div className="w-full h-1 bg-white/20 rounded-full group-hover/timeline:h-1.5 transition-all">
                {/* Progress bar */}
                <div
                  className="h-full bg-primary rounded-full relative transition-all"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>

              {/* Event markers */}
              {finalPositionedGroups.map((group, groupIndex) => {
                const isActive = group.date <= currentDate;

                return (
                  <TooltipProvider key={`provider-${group.dateKey}`} delayDuration={50} skipDelayDuration={0}>
                    <Tooltip
                      {...(isMobile && {
                        open: openTooltip === group.dateKey && !isDragging,
                        onOpenChange: (open) => {
                          if (!isDragging) {
                            setOpenTooltip(open ? group.dateKey : null);
                          }
                        }
                      })}
                      {...(!isMobile && {
                        open: isDragging ? false : undefined
                      })}
                    >
                      <TooltipTrigger asChild>
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20"
                        style={{ left: `${group.progress}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Use original progress for accurate date navigation
                          const targetProgress = (group as any).originalProgress || group.progress;
                          const newTimestamp = startDate.getTime() + (targetProgress / 100) * totalDuration;
                          onDateChange(new Date(newTimestamp));
                          if (isMobile) {
                            setOpenTooltip(openTooltip === group.dateKey ? null : group.dateKey);
                          }
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          if (isMobile) {
                            // For mobile, use long press to show tooltips
                            const longPressTimer = setTimeout(() => {
                              setOpenTooltip(openTooltip === group.dateKey ? null : group.dateKey);
                            }, 500);

                            const handleTouchEnd = () => {
                              clearTimeout(longPressTimer);
                            };

                            const handleTouchMove = () => {
                              clearTimeout(longPressTimer);
                            };

                            document.addEventListener('touchend', handleTouchEnd, { once: true });
                            document.addEventListener('touchmove', handleTouchMove, { once: true });
                          }
                        }}
                        onTouchEnd={(e) => {
                          e.stopPropagation();
                          // Quick tap on marker - jump to that date
                          if (isMobile && !isDragging) {
                            const targetProgress = (group as any).originalProgress || group.progress;
                            const newTimestamp = startDate.getTime() + (targetProgress / 100) * totalDuration;
                            onDateChange(new Date(newTimestamp));
                          }
                        }}
                      >
                        <div
                          className={`w-2 h-2 rounded-full border border-white/60 transition-all hover:scale-150 hover:border-white ${
                            isActive
                              ? "bg-primary shadow-lg shadow-primary/50"
                              : "bg-white/40 hover:bg-white/80"
                          }`}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs" sideOffset={12}>
                      <div className="text-xs space-y-2">
                        {group.events.map((event, eventIndex) => (
                          <div key={eventIndex} className={eventIndex > 0 ? "border-t border-white/20 pt-2" : ""}>
                            <div className="font-medium">{event.description}</div>
                            {event.details && (
                              <div className="text-muted-foreground mt-1">
                                {event.details}
                              </div>
                            )}
                            {eventIndex === 0 && (
                              <div className="text-muted-foreground mt-1">
                                {event.date.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}

              {/* Scrubber handle - YouTube style */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 transition-all ${isDragging ? 'scale-110' : ''}`}
                style={{ left: `${currentProgress}%` }}
              >
                <div className={`w-3 h-3 bg-primary rounded-full shadow-lg transition-all group-hover/timeline:w-4 group-hover/timeline:h-4 ${isDragging ? 'scale-110' : ''}`} />
              </div>
            </div>
          </div>

          {/* End date */}
          <div className="text-xs text-white/60 whitespace-nowrap flex-shrink-0 text-center min-w-[3rem]">
            <div>{endDate.toLocaleDateString("en-US", { month: "short" })}</div>
            <div>{endDate.getFullYear()}</div>
          </div>
        </div>
      </div>
  );
}