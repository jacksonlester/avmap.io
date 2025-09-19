import { useState, useEffect } from "react";
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
  // Convert dates to slider values (0-100)
  const totalDuration = endDate.getTime() - startDate.getTime();
  const currentProgress =
    ((currentDate.getTime() - startDate.getTime()) / totalDuration) * 100;

  const handleSliderChange = (value: number[]) => {
    const newTimestamp = startDate.getTime() + (value[0] / 100) * totalDuration;
    onDateChange(new Date(newTimestamp));
  };

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

  // Handle icon positioning to prevent overlaps
  const finalPositionedGroups = positionedEventGroups.map((group, index) => {
    let iconOffset = 0;

    // Calculate minimum distance needed between icons (assuming ~16px icon width + 4px margin)
    const minDistance = 3; // 3% of timeline width should be minimum distance

    // Check for overlaps with previous groups
    for (let i = index - 1; i >= 0; i--) {
      const prevGroup = positionedEventGroups[i];
      const distance = Math.abs(group.progress - prevGroup.progress);

      if (distance < minDistance) {
        // Calculate how many icons we need to offset
        const totalPrevIcons = positionedEventGroups.slice(0, index)
          .filter(pg => Math.abs(pg.progress - group.progress) < minDistance)
          .reduce((acc, pg) => acc + pg.events.length, 0);

        iconOffset = totalPrevIcons * 12; // 12px per previous icon for tighter clustering
        break;
      }
    }

    return {
      ...group,
      iconOffset,
    };
  });

  return (
    <TooltipProvider delayDuration={150}>
      <div className={`space-y-3 ${className}`}>
        {/* Timeline with events */}
        <div className="relative flex items-center gap-3 pt-6">
          {/* Start date - two lines */}
          <div className="text-xs text-white/60 whitespace-nowrap flex-shrink-0 text-center">
            <div>{startDate.toLocaleDateString("en-US", { month: "short" })}</div>
            <div>{startDate.getFullYear()}</div>
          </div>

          {/* Timeline container */}
          <div className="flex-1 relative">
            {DEBUG && (
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-red-500/60 pointer-events-none z-[999]" />
            )}

            {/* Layer 1: TRACK (z-10) */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full bg-white/20 z-10">
              {/* Progress range */}
              <div
                className="absolute h-full bg-primary rounded-full"
                style={{ width: `${currentProgress}%` }}
              />
            </div>

            {/* Layer 2: TICKS overlay (z-20) */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {finalPositionedGroups.map((group, groupIndex) => {
                const isActive = group.date <= currentDate;

                return (
                  <Tooltip
                    key={group.dateKey}
                    {...(isMobile && {
                      open: openTooltip === group.dateKey,
                      onOpenChange: (open) => {
                        setOpenTooltip(open ? group.dateKey : null);
                      }
                    })}
                  >
                    <TooltipTrigger asChild>
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-auto cursor-pointer${DEBUG ? ' outline outline-1 outline-amber-500/60' : ''}`}
                        style={{ left: `${group.progress}%` }}
                        onClick={() => {
                          if (isMobile) {
                            setOpenTooltip(openTooltip === group.dateKey ? null : group.dateKey);
                          }
                        }}
                        aria-hidden="true"
                      >
                        {/* Vertical tick mark */}
                        <div
                          className={`w-[2px] h-4 transition-all ${
                            isActive
                              ? "bg-blue-400 shadow-lg shadow-blue-400/50"
                              : "bg-white/50"
                          }`}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs" sideOffset={8}>
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
                );
              })}
            </div>

            {/* Layer 3: HANDLE (z-30) */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer z-30${DEBUG ? ' outline outline-1 outline-amber-500/60' : ''}`}
              style={{ left: `${currentProgress}%` }}
              tabIndex={0}
              role="slider"
              aria-label="Timeline scrubber"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={currentProgress}
            />

            {/* Layer 4: INPUT (z-40) */}
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={currentProgress}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                const newTimestamp = startDate.getTime() + (value / 100) * totalDuration;
                onDateChange(new Date(newTimestamp));
              }}
              className="absolute inset-0 z-40 opacity-0 cursor-pointer appearance-none bg-transparent"
              aria-label="Timeline scrubber input"
            />
          </div>

          {/* End date - two lines */}
          <div className="text-xs text-white/60 whitespace-nowrap flex-shrink-0 text-center">
            <div>{endDate.toLocaleDateString("en-US", { month: "short" })}</div>
            <div>{endDate.getFullYear()}</div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}