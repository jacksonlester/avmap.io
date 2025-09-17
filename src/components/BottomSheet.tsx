import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ServiceArea, COMPANY_COLORS, HistoricalServiceArea, SERVICE_LINKS, ServiceLink } from "@/types";
import { XIcon, ExternalLinkIcon, Building2, Smartphone, Shield, Users, DollarSign, MousePointer, Car } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BottomSheetProps {
  serviceArea: ServiceArea | HistoricalServiceArea | null;
  isOpen: boolean;
  onClose: () => void;
  isTimelineMode?: boolean;
  timelineDate?: Date;
}

// Service field metadata with icons and tooltips (matching filter pane)
const SERVICE_METADATA = {
  platform: {
    label: "Booking Platform",
    tooltip: "The app platform where riders can access the service",
    icon: Smartphone
  },
  supervision: {
    label: "Supervision",
    tooltip: "Whether the vehicle has a safety driver, safety attendant, or operates fully autonomously",
    icon: Shield
  },
  access: {
    label: "Service Availability",
    tooltip: "Who can ride the service",
    icon: Users
  },
  fares: {
    label: "Charges Fares?",
    tooltip: "Whether the service charges fares",
    icon: DollarSign
  },
  publicAccess: {
    label: "Public Access?",
    tooltip: "Whether the service is available to the general public",
    icon: Users
  },
  directBooking: {
    label: "Direct Booking?",
    tooltip: "Whether riders can request an AV directly or only receive one by chance through a larger fleet",
    icon: MousePointer
  }
};

export function BottomSheet({ serviceArea, isOpen, onClose, isTimelineMode = false, timelineDate }: BottomSheetProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Get historically accurate data for timeline mode with debouncing
  const [historicallyAccurateArea, setHistoricallyAccurateArea] = useState<ServiceArea | HistoricalServiceArea | null>(serviceArea);
  const [isLoadingHistoricalData, setIsLoadingHistoricalData] = useState(false);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Don't close if clicking on the BottomSheet itself
      if (cardRef.current && cardRef.current.contains(target)) {
        return;
      }

      // Don't close if clicking on timeline controls
      const timelineContainer = document.querySelector('[data-timeline-container]');
      if (timelineContainer && timelineContainer.contains(target)) {
        return;
      }

      // Don't close if clicking on filters overlay
      const filtersOverlay = document.getElementById('filters-overlay');
      if (filtersOverlay && filtersOverlay.contains(target)) {
        return;
      }

      onClose();
    };

    // Add delay to prevent immediate closure when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Update historical data when timeline changes (with debouncing to prevent flickering)
  useEffect(() => {
    if (!isTimelineMode || !timelineDate || !serviceArea) {
      setHistoricallyAccurateArea(serviceArea);
      setIsLoadingHistoricalData(false);
      return;
    }

    // Look up the historical state for this service at the timeline date
    const getHistoricalState = async () => {
      setIsLoadingHistoricalData(true);
      try {
        const { getAllServicesAtDate } = await import('@/lib/eventService');
        const historicalServices = await getAllServicesAtDate(timelineDate);

        // Find the service that matches the clicked area
        const historicalService = historicalServices.find(service =>
          service.company === serviceArea.company && service.name === serviceArea.name
        );

        console.log('Historical service found:', historicalService);
        console.log('Timeline date:', timelineDate);
        console.log('Service area:', serviceArea);

        // If no historical service exists at this date, set to null to show N/A
        setHistoricallyAccurateArea(historicalService || null);
      } catch (error) {
        console.error('Error getting historical service state:', error);
        setHistoricallyAccurateArea(serviceArea);
      } finally {
        setIsLoadingHistoricalData(false);
      }
    };

    getHistoricalState();
  }, [isTimelineMode, timelineDate, serviceArea]);

  if (!isOpen || !serviceArea) return null;

  const companyConfig = COMPANY_COLORS[serviceArea.company];

  // Get static links for this service (doesn't change with timeline)
  const getServiceLinks = (): ServiceLink[] => {
    const linkKey = `${serviceArea.company} ${serviceArea.name}`;
    console.log('Looking for links with key:', linkKey);
    console.log('Available keys:', Object.keys(SERVICE_LINKS));
    const links = SERVICE_LINKS[linkKey] || [];
    console.log('Found links:', links);
    return links;
  };

  const serviceLinks = getServiceLinks();

  // Format the title based on timeline mode
  const getTitle = () => {
    const dateText = isTimelineMode ? 'as of Today' : 'as of Today';
    return `${serviceArea.company} ${serviceArea.name} Service ${dateText}`;
  };

  // Convert access values for display
  const getAccessDisplay = (access: string) => {
    if (access === 'Yes') return 'Public';
    if (access === 'No') return 'Waitlist';
    return access;
  };

  const getPublicAccessDisplay = (access: string) => {
    if (access === 'Public') return 'Yes';
    if (access === 'Waitlist') return 'No';
    return access === 'Yes' ? 'Yes' : 'No';
  };


  // Helper function to get field value or N/A
  const getFieldValue = (field: keyof (ServiceArea | HistoricalServiceArea), fallback: string = 'N/A') => {
    if (!historicallyAccurateArea) return 'N/A';
    return (historicallyAccurateArea as any)[field] || fallback;
  };

  return (
    <TooltipProvider>
      <div data-bottom-sheet className="fixed bottom-0 right-0 z-50 mr-4 mb-4 max-w-lg w-full md:w-auto">
        <Card
          ref={cardRef}
          className="shadow-xl border border-white/10 bg-black/50 text-white backdrop-blur-md"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: companyConfig.color }}
              />
              <CardTitle className="text-base font-semibold leading-tight">
                {getTitle()}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Platform */}
            <ServiceField
              metadata={SERVICE_METADATA.platform}
              value={getFieldValue('platform', 'Unknown')}
            />

            {/* Supervision */}
            <ServiceField
              metadata={SERVICE_METADATA.supervision}
              value={getFieldValue('supervision', 'Fully Autonomous')}
            />

            {/* Service Availability */}
            <ServiceField
              metadata={SERVICE_METADATA.access}
              value={historicallyAccurateArea ? getAccessDisplay(getFieldValue('access', 'Public')) : 'N/A'}
            />

            {/* Charges Fares */}
            <ServiceField
              metadata={SERVICE_METADATA.fares}
              value={getFieldValue('fares', 'Yes')}
            />

            {/* Public Access */}
            <ServiceField
              metadata={SERVICE_METADATA.publicAccess}
              value={historicallyAccurateArea ? getPublicAccessDisplay(getFieldValue('access', 'Public')) : 'N/A'}
            />

            {/* Direct Booking */}
            <ServiceField
              metadata={SERVICE_METADATA.directBooking}
              value={getFieldValue('directBooking', 'Yes')}
            />

            {/* Service Links - Static, don't change with timeline */}
            {serviceLinks.length > 0 && (
              <div className="pt-4 mt-4 border-t border-white/10">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-white/70 uppercase tracking-wide font-medium mb-1">
                    Quick Links
                  </span>
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
                          <span className="text-sm font-medium">{link.label}</span>
                        </a>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
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

  return (
    <div className="flex items-center justify-between">
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
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}