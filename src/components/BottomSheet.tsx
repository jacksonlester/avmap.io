import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ServiceArea,
  COMPANY_COLORS,
  HistoricalServiceArea,
  SERVICE_LINKS,
  ServiceLink,
} from "@/types";
import {
  XIcon,
  ExternalLinkIcon,
  Building2,
  Smartphone,
  Shield,
  Users,
  DollarSign,
  Target,
  Car,
  MapPin,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ServiceTimeline } from "@/components/ServiceTimeline";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ServiceEvent {
  date: Date;
  type: string;
  description: string;
  details?: string;
}

interface BottomSheetProps {
  serviceArea: ServiceArea | HistoricalServiceArea | null;
  isOpen: boolean;
  onClose: () => void;
  isTimelineMode?: boolean;
  timelineDate?: Date;
  onTimelineeDateChange?: (date: Date) => void;
  serviceEvents?: ServiceEvent[];
  serviceTimelineRange?: { start: Date; end: Date } | null;
}

// Service field metadata with icons and tooltips (matching filter pane)
const getServiceMetadata = (isMobile: boolean) => {
  return {
    platform: {
      label: isMobile ? "Platform" : "Booking Platform",
      tooltip: "The app platform where riders can access the service",
      icon: Smartphone,
    },
    supervision: {
      label: "Supervision",
      tooltip:
        "Whether the vehicle has a safety driver, safety attendant, or operates fully autonomously",
      icon: Shield,
    },
    access: {
      label: isMobile ? "Availability" : "Service Availability",
      tooltip: "Who can ride the service",
      icon: Users,
    },
    fares: {
      label: isMobile ? "Fares" : "Charges Fares?",
      tooltip: "Whether the service charges fares",
      icon: DollarSign,
    },
    directBooking: {
      label: "Direct Booking?",
      tooltip:
        "Whether riders can request an AV directly or only receive one by chance through a larger fleet",
      icon: Target,
    },
    vehicleTypes: {
      label: "Vehicles",
      tooltip: "The types of vehicles used in this service",
      icon: Car,
    },
    area: {
      label: "Service Area",
      tooltip: "The coverage area of this autonomous vehicle service",
      icon: MapPin,
    },
  };
};

export function BottomSheet({
  serviceArea,
  isOpen,
  onClose,
  isTimelineMode = false,
  timelineDate,
  onTimelineeDateChange,
  serviceEvents = [],
  serviceTimelineRange,
}: BottomSheetProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Debug logging
  React.useEffect(() => {
    if (serviceArea && isOpen) {
      console.log("BottomSheet received serviceArea:", {
        id: serviceArea.id,
        name: serviceArea.name,
        company: serviceArea.company,
        vehicleTypes: serviceArea.vehicleTypes,
        vehicle_types: (serviceArea as ServiceArea & { vehicle_types?: string }).vehicle_types,
        allKeys: Object.keys(serviceArea),
        fullObject: serviceArea,
      });
    }
  }, [serviceArea, isOpen]);

  // Get historically accurate data for timeline mode with debouncing
  const [historicallyAccurateArea, setHistoricallyAccurateArea] = useState<
    ServiceArea | HistoricalServiceArea | null
  >(serviceArea);
  const [isLoadingHistoricalData, setIsLoadingHistoricalData] = useState(false);

  // Handle click outside to close (but not drag)
  useEffect(() => {
    if (!isOpen) return;

    let mouseDownPosition: { x: number; y: number } | null = null;
    const DRAG_THRESHOLD = 5; // pixels

    const handleMouseDown = (event: MouseEvent) => {
      mouseDownPosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (!mouseDownPosition) return;

      // Calculate distance moved
      const deltaX = Math.abs(event.clientX - mouseDownPosition.x);
      const deltaY = Math.abs(event.clientY - mouseDownPosition.y);
      const totalDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Only close if it was a click (not a drag)
      if (totalDistance <= DRAG_THRESHOLD) {
        const target = event.target as Node;

        // Don't close if clicking on the BottomSheet itself
        if (cardRef.current && cardRef.current.contains(target)) {
          return;
        }

        // Don't close if clicking on timeline controls
        const timelineContainer = document.querySelector(
          "[data-timeline-container]"
        );
        if (timelineContainer && timelineContainer.contains(target)) {
          return;
        }

        // Don't close if clicking on filters overlay
        const filtersOverlay = document.getElementById("filters-overlay");
        if (filtersOverlay && filtersOverlay.contains(target)) {
          return;
        }

        // Don't close if clicking on service selector popup
        const serviceSelector = document.querySelector(".mapboxgl-popup");
        if (serviceSelector && serviceSelector.contains(target)) {
          return;
        }

        // Don't close if clicking on header (theme toggle, etc.)
        const header = document.querySelector("header");
        if (header && header.contains(target)) {
          return;
        }

        onClose();
      }

      mouseDownPosition = null;
    };

    // Add delay to prevent immediate closure when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown);
      document.addEventListener("mouseup", handleMouseUp);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isOpen, onClose]);

  // Update historical data when timeline changes (with debouncing to prevent flickering)
  useEffect(() => {
    if (!timelineDate || !serviceArea) {
      setHistoricallyAccurateArea(serviceArea);
      setIsLoadingHistoricalData(false);
      return;
    }

    // Look up the historical state for this service at the timeline date
    const getHistoricalState = async () => {
      setIsLoadingHistoricalData(true);
      try {
        const { getAllServicesAtDate } = await import("@/lib/eventService");
        const historicalServices = await getAllServicesAtDate(timelineDate);

        // Find the service that matches the clicked area
        const historicalService = historicalServices.find(
          (service) =>
            service.company === serviceArea.company &&
            service.name === serviceArea.name
        );

        console.log("Historical service found:", historicalService);
        console.log("Timeline date:", timelineDate);
        console.log("Service area:", serviceArea);


        // If no historical service exists at this date, set to null to show N/A
        setHistoricallyAccurateArea(historicalService || null);
      } catch (error) {
        console.error("Error getting historical service state:", error);
        setHistoricallyAccurateArea(serviceArea);
      } finally {
        setIsLoadingHistoricalData(false);
      }
    };

    getHistoricalState();
  }, [timelineDate, serviceArea]);

  if (!isOpen || !serviceArea) return null;

  const companyConfig = COMPANY_COLORS[serviceArea.company];

  // Get static links for this service (doesn't change with timeline)
  const getServiceLinks = (): ServiceLink[] => {
    const linkKey = `${serviceArea.company} ${serviceArea.name}`;
    console.log("Looking for links with key:", linkKey);
    console.log("Available keys:", Object.keys(SERVICE_LINKS));
    const links = SERVICE_LINKS[linkKey] || [];
    console.log("Found links:", links);
    return links;
  };

  const serviceLinks = getServiceLinks();
  const serviceMetadata = getServiceMetadata(isMobile);

  // Get the service name (first line)
  const getServiceName = () => {
    return `${serviceArea.company} ${serviceArea.name} Service`;
  };

  // Get the date text (second line)
  const getDateText = () => {
    if (timelineDate) {
      return `As of: ${timelineDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    }

    return `As of: ${new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  };

  // Convert access values for display
  const getAccessDisplay = (access: string) => {
    if (access === "Yes") return "Public";
    if (access === "No") return "Waitlist";
    return access;
  };

  // Helper function to get field value or N/A
  const getFieldValue = (
    field: keyof (ServiceArea | HistoricalServiceArea),
    fallback: string = "N/A"
  ) => {
    if (!historicallyAccurateArea) return "N/A";
    const value = (historicallyAccurateArea as Record<string, unknown>)[field];

    // Debug logging for vehicleTypes
    if (field === "vehicleTypes") {
      console.log("Getting vehicleTypes:", {
        field,
        value,
        historicallyAccurateArea,
        allKeys: Object.keys(historicallyAccurateArea),
      });
    }

    return value || fallback;
  };

  // Helper function to get area display value that updates with timeline
  const getAreaDisplay = () => {
    if (!historicallyAccurateArea) return "N/A";

    // The area should be directly on the historical service area object
    const areaValue = (historicallyAccurateArea as any).area_square_miles;

    if (areaValue && typeof areaValue === 'number') {
      return `~ ${Math.round(areaValue)} sq mi`;
    }

    return "Calculating...";
  };

  return (
    <TooltipProvider>
      <div
        data-bottom-sheet
        className={cn(
          "fixed z-50",
          isMobile
            ? "bottom-0 left-0 right-0 w-full max-h-[40vh] flex flex-col"
            : "bottom-0 right-0 mr-4 mb-4 w-full max-w-md md:w-[36rem]"
        )}
      >
        <Card
          ref={cardRef}
          className={cn(
            "shadow-xl border border-white/10 bg-black/50 text-white backdrop-blur-md",
            isMobile ? "flex flex-col h-full min-h-0" : ""
          )}
          onClick={(e) => {
            console.log("Card clicked!", e.target);
            e.stopPropagation();
          }}
        >
          {/* Fixed Header on Mobile */}
          <CardHeader className={cn(
            "flex flex-row items-start justify-between space-y-0 pb-3",
            isMobile ? "flex-shrink-0" : ""
          )}>
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: companyConfig.color }}
              />
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base font-semibold leading-tight">
                  {getServiceName()}
                </CardTitle>
                <p className="text-sm text-white/70 mt-0.5">{getDateText()}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                console.log("Close button clicked!", e);
                e.stopPropagation();
                e.preventDefault();
                onClose();
              }}
              className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </CardHeader>

          {/* Timeline Slider - Fixed on Mobile */}
          {isMobile && serviceEvents.length > 0 && serviceTimelineRange && timelineDate && onTimelineeDateChange && (
            <div className="flex-shrink-0 px-6 py-2 border-b border-white/10">
              <ServiceTimeline
                serviceId={serviceArea.id}
                serviceName={serviceArea.name}
                startDate={serviceTimelineRange.start}
                endDate={serviceTimelineRange.end}
                currentDate={timelineDate}
                onDateChange={onTimelineeDateChange}
                events={serviceEvents}
              />
            </div>
          )}

          {/* Scrollable Content on Mobile, Normal Content on Desktop */}
          <CardContent className={cn(
            "space-y-3",
            isMobile
              ? "overflow-y-auto flex-1 p-4 relative min-h-0"
              : ""
          )}>
            {/* Scroll Indicator for Mobile */}
            {isMobile && (
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            )}

            {isMobile ? (
              /* Mobile: Two column layout */
              <div className="grid grid-cols-2 gap-4">
                <ServiceFieldMobile
                  metadata={serviceMetadata.area}
                  value={getAreaDisplay()}
                />
                <ServiceFieldMobile
                  metadata={serviceMetadata.platform}
                  value={getFieldValue("platform", "Unknown")}
                />
                <ServiceFieldMobile
                  metadata={serviceMetadata.supervision}
                  value={getFieldValue("supervision", "Autonomous")}
                />
                <ServiceFieldMobile
                  metadata={serviceMetadata.access}
                  value={
                    historicallyAccurateArea
                      ? getAccessDisplay(getFieldValue("access", "Public"))
                      : "N/A"
                  }
                />
                <ServiceFieldMobile
                  metadata={serviceMetadata.fares}
                  value={getFieldValue("fares", "Yes")}
                />
                <ServiceFieldMobile
                  metadata={serviceMetadata.directBooking}
                  value={getFieldValue("directBooking", "Yes")}
                />
                <ServiceFieldMobile
                  metadata={serviceMetadata.vehicleTypes}
                  value={getFieldValue("vehicleTypes", "N/A")}
                />
              </div>
            ) : (
              /* Desktop: Original layout */
              <>
                <ServiceField
                  metadata={serviceMetadata.area}
                  value={getAreaDisplay()}
                />
                <ServiceField
                  metadata={serviceMetadata.platform}
                  value={getFieldValue("platform", "Unknown")}
                />
                <ServiceField
                  metadata={serviceMetadata.supervision}
                  value={getFieldValue("supervision", "Autonomous")}
                />
                <ServiceField
                  metadata={serviceMetadata.access}
                  value={
                    historicallyAccurateArea
                      ? getAccessDisplay(getFieldValue("access", "Public"))
                      : "N/A"
                  }
                />
                <ServiceField
                  metadata={serviceMetadata.fares}
                  value={getFieldValue("fares", "Yes")}
                />
                <ServiceField
                  metadata={serviceMetadata.directBooking}
                  value={getFieldValue("directBooking", "Yes")}
                />
                <ServiceField
                  metadata={serviceMetadata.vehicleTypes}
                  value={getFieldValue("vehicleTypes", "N/A")}
                />
              </>
            )}

            {/* Service Timeline for Desktop */}
            {!isMobile && serviceEvents.length > 0 && serviceTimelineRange && timelineDate && onTimelineeDateChange && (
              <div className="pt-4 mt-4 border-t border-white/10">
                <ServiceTimeline
                  serviceId={serviceArea.id}
                  serviceName={serviceArea.name}
                  startDate={serviceTimelineRange.start}
                  endDate={serviceTimelineRange.end}
                  currentDate={timelineDate}
                  onDateChange={onTimelineeDateChange}
                  events={serviceEvents}
                />
              </div>
            )}

            {/* Service Links - Part of scrollable content */}
            {serviceLinks.length > 0 && (
              <div className={cn(
                "pt-4 mt-4 border-t border-white/10",
                isMobile ? "pb-4" : ""
              )}>
                <div className="flex flex-col gap-2">
                  {serviceLinks.map((link, index) => (
                      <Button
                        key={index}
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-9 justify-start bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-colors"
                      >
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 w-full"
                        >
                          <ExternalLinkIcon className="h-3.5 w-3.5" />
                          <span className="text-sm font-medium">
                            {link.label}
                          </span>
                        </a>
                      </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Scroll Indicator for Mobile */}
            {isMobile && (
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            )}
          </CardContent>

          {/* Visual Right-side Scroll Indicator for Mobile */}
          {isMobile && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col gap-1 opacity-30">
              <div className="w-1 h-2 bg-white/40 rounded-full"></div>
              <div className="w-1 h-2 bg-white/20 rounded-full"></div>
              <div className="w-1 h-2 bg-white/40 rounded-full"></div>
            </div>
          )}
        </Card>
      </div>
    </TooltipProvider>
  );
}

// Helper component for service fields with tooltips
interface ServiceFieldProps {
  metadata: {
    label: string;
    tooltip: string;
    icon: any;
  };
  value: string;
}

function ServiceField({ metadata, value }: ServiceFieldProps) {
  const IconComponent = metadata.icon;

  // Split comma-separated values and trim whitespace
  const values = value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  return (
    <div className="flex items-start justify-between">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <IconComponent className="h-3 w-3 text-white/60" />
            <span className="text-xs text-white/70 uppercase tracking-wide">
              {metadata.label}:
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{metadata.tooltip}</p>
        </TooltipContent>
      </Tooltip>
      <div className="text-sm font-medium text-white text-right">
        {values.map((val, index) => (
          <div key={index}>{val}</div>
        ))}
      </div>
    </div>
  );
}

// Mobile version with stacked layout and touch-and-hold tooltips
function ServiceFieldMobile({ metadata, value }: ServiceFieldProps) {
  const IconComponent = metadata.icon;
  const [showTooltip, setShowTooltip] = useState(false);
  const [touchTimer, setTouchTimer] = useState<NodeJS.Timeout | null>(null);

  // Split comma-separated values and trim whitespace
  const values = value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't prevent default to allow scrolling
    const timer = setTimeout(() => {
      setShowTooltip(true);
      // Hide tooltip after 3 seconds
      setTimeout(() => setShowTooltip(false), 3000);
    }, 500); // Show tooltip after 500ms hold
    setTouchTimer(timer);
  };

  const handleTouchEnd = () => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      setTouchTimer(null);
    }
  };

  const handleTouchCancel = () => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      setTouchTimer(null);
    }
  };

  return (
    <div className="flex flex-col space-y-1 relative">
      <div
        className="flex items-center gap-2 active:bg-white/10 rounded p-1 -m-1 transition-colors"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <IconComponent className="h-3 w-3 text-white/60" />
        <span className="text-xs text-white/70 uppercase tracking-wide">
          {metadata.label}
        </span>
      </div>

      {/* Touch-and-hold tooltip */}
      {showTooltip && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 p-2 bg-black/90 text-white text-xs rounded border border-white/20 backdrop-blur-sm">
          {metadata.tooltip}
        </div>
      )}

      <div className="text-sm font-medium text-white">
        {values.map((val, index) => (
          <div key={index}>{val}</div>
        ))}
      </div>
    </div>
  );
}
