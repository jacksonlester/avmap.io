import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { Map } from "@/components/Map";
import { BottomSheet } from "@/components/BottomSheet";
import { TimeSlider } from "@/components/TimeSlider";
import {
  FiltersOverlay,
  FiltersState,
  Taxonomy,
} from "@/components/filters/FiltersOverlay";
import {
  ServiceArea,
  ServiceAreaData,
  MapFilters,
  HistoricalServiceArea,
} from "@/types";
import {
  getAllServicesAtDate,
  getCurrentServiceAreas,
  getAllHistoricalServiceStates,
  getServiceTimelineTicks,
} from "@/lib/eventService";
import { loadGeometry } from "@/lib/storageService";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { History } from "lucide-react";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // Initialize selected area from URL
  const [selectedArea, setSelectedArea] = useState<
    ServiceArea | HistoricalServiceArea | null
  >(null);

  // Initialize timeline data state early
  const [activeHistoricalAreas, setActiveHistoricalAreas] = useState<
    HistoricalServiceArea[]
  >([]);

  // Initialize selected area ID from URL parameter
  const selectedAreaIdFromUrl = searchParams.get("selected");

  // Initialize timeline date from URL or default to today
  const [currentTimelineDate, setCurrentTimelineDate] = useState<Date>(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    return new Date();
  });

  const [isTimelineMode, setIsTimelineMode] = useState(true);

  // Map viewport state
  const [mapViewport, setMapViewport] = useState<{
    center: [number, number];
    zoom: number;
  } | null>(() => {
    const centerParam = searchParams.get("center");
    const zoomParam = searchParams.get("zoom");

    if (centerParam && zoomParam) {
      try {
        const center = centerParam.split(",").map(Number) as [number, number];
        const zoom = parseFloat(zoomParam);

        if (
          center.length === 2 &&
          !isNaN(center[0]) &&
          !isNaN(center[1]) &&
          !isNaN(zoom)
        ) {
          return { center, zoom };
        }
      } catch (error) {
        console.warn("Failed to parse map viewport from URL:", error);
      }
    }
    return null;
  });

  // Stabilize initial viewport - only use mapViewport for the initial setup, not for continuous updates
  const initialViewport = useMemo(() => mapViewport, []); // Only use the initial value
  const [taxonomy] = useState<Taxonomy>({
    companies: ["Waymo", "Tesla", "Zoox", "May Mobility"],
    platform: ["Waymo", "Uber", "Lyft", "Robotaxi", "Zoox"],
    supervision: ["Autonomous", "Safety Driver", "Safety Attendant"],
    access: ["Public", "Waitlist"],
    fares: ["Yes", "No"],
    directBooking: ["Yes", "No"],
  });
  const isMobile = useIsMobile();

  // Always use historical data - "today" is just the latest historical state

  // Initialize filters from URL params with all options checked by default
  const [filters, setFilters] = useState<FiltersState>(() => {
    const allCompanies = ["Waymo", "Tesla", "Zoox", "May Mobility"];
    const allPlatforms = ["Waymo", "Uber", "Lyft", "Robotaxi", "Zoox"];
    const allSupervision = ["Autonomous", "Safety Driver", "Safety Attendant"];
    const allAccess = ["Yes", "No"];
    const allFares = ["Yes", "No"];
    const allDirectBooking = ["Yes", "No"];

    return {
      companies:
        searchParams.get("company")?.split(",").filter(Boolean) || allCompanies,
      platform:
        searchParams.get("platform")?.split(",").filter(Boolean) ||
        allPlatforms,
      supervision:
        searchParams.get("supervision")?.split(",").filter(Boolean) ||
        allSupervision,
      access:
        searchParams.get("access")?.split(",").filter(Boolean) || allAccess,
      fares: searchParams.get("fares")?.split(",").filter(Boolean) || allFares,
      directBooking:
        searchParams.get("directBooking")?.split(",").filter(Boolean) ||
        allDirectBooking,
    };
  });

  // No separate current service areas - historical data includes "today"

  // Load historical service states - all or just selected based on focus mode
  useEffect(() => {
    const loadAllHistoricalStates = async () => {
      try {
        const allStates = await getAllHistoricalServiceStates();

        // Focus mode: only load historical states for the selected service
        if (selectedAreaIdFromUrl) {
          const selectedStates = allStates.filter(
            (s) => s.id === selectedAreaIdFromUrl
          );
          console.log(
            "🎯 Focus mode: loading historical states for selected service only:",
            selectedStates.length
          );
          setAllHistoricalAreas(selectedStates as HistoricalServiceArea[]);
        } else {
          // Normal mode: load all historical states
          console.log("🌍 Normal mode: loading all historical states");
          setAllHistoricalAreas(allStates as HistoricalServiceArea[]);
        }
      } catch (error) {
        console.error("Failed to load all historical service states:", error);
      }
    };
    loadAllHistoricalStates();
  }, [selectedAreaIdFromUrl]);

  // Timeline date is initialized directly in useState above

  // Load historical service areas for timeline date using event sourcing (debounced)
  useEffect(() => {
    if (!currentTimelineDate) return;

    // Debounce the loading to prevent flickering during timeline dragging
    const timeoutId = setTimeout(async () => {
      console.log(
        "🔄 Loading historical areas for date:",
        currentTimelineDate.toISOString()
      );

      try {
        // For any date (including today), get historical events up to that date
        // This ensures we get the latest state available as of that date
        const services = await getAllServicesAtDate(currentTimelineDate);

        // Debug logging for Silicon Valley issue
        console.log("📅 Timeline date:", currentTimelineDate.toISOString());
        console.log("🔍 Total services loaded:", services.length);

        const siliconValleyServices = services.filter(
          (s) =>
            s.name?.toLowerCase().includes("silicon valley") ||
            s.city?.toLowerCase().includes("silicon valley") ||
            s.id?.toLowerCase().includes("silicon-valley")
        );
        console.log(
          "🏔️ Silicon Valley historical services found:",
          siliconValleyServices.length,
          siliconValleyServices
        );

        // Focus mode: only show the selected service's historical data
        if (selectedAreaIdFromUrl) {
          const selectedServices = services.filter(
            (s) => s.id === selectedAreaIdFromUrl
          );
          console.log(
            "🎯 Focus mode: filtering historical areas for selected service:",
            selectedServices.length
          );
          setActiveHistoricalAreas(selectedServices as HistoricalServiceArea[]);
          console.log(
            "✅ Set activeHistoricalAreas to:",
            selectedServices.length,
            "services (focus mode)"
          );
        } else {
          // Normal mode: show all services for this date
          setActiveHistoricalAreas(services as HistoricalServiceArea[]);
          console.log(
            "✅ Set activeHistoricalAreas to:",
            services.length,
            "services (normal mode)"
          );
        }
      } catch (error) {
        console.error("Failed to load historical service areas:", error);
        setActiveHistoricalAreas([]);
      }
    }, 15); // 15ms debounce delay

    // Cleanup timeout on unmount or when dependencies change
    return () => clearTimeout(timeoutId);
  }, [currentTimelineDate, selectedAreaIdFromUrl]);

  // Load service timeline ticks when a service is selected
  useEffect(() => {
    if (!selectedArea) {
      setServiceTicks([]);
      setServiceTimelineRange(null);
      return;
    }

    const loadServiceTicks = async () => {
      try {
        const ticks = await getServiceTimelineTicks(selectedArea.id);
        setServiceTicks(ticks);

        // Set service-specific timeline range
        if (ticks.length > 0) {
          const startDate = ticks[0].date; // First event
          const endDate =
            ticks[ticks.length - 1].event_type === "service_ended"
              ? ticks[ticks.length - 1].date
              : new Date(); // Present day or service end

          setServiceTimelineRange({ start: startDate, end: endDate });
        }
      } catch (error) {
        console.error("Failed to load service timeline ticks:", error);
        setServiceTicks([]);
        setServiceTimelineRange(null);
      }
    };

    loadServiceTicks();
  }, [selectedArea]);

  // Load selected area from URL once historical areas are available
  useEffect(() => {
    if (
      selectedAreaIdFromUrl &&
      activeHistoricalAreas.length > 0 &&
      !selectedArea
    ) {
      const areaFromUrl = activeHistoricalAreas.find(
        (area) => area.id === selectedAreaIdFromUrl
      );
      if (areaFromUrl) {
        setSelectedArea(areaFromUrl);
      }
    }
  }, [selectedAreaIdFromUrl, activeHistoricalAreas, selectedArea]);

  // Track if this is the initial load to prevent immediate URL updates
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Update URL when state changes (but not on initial load)
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      const currentParams = new URLSearchParams(searchParams.toString());
      const newParams = new URLSearchParams();

      // Update filters
      if (filters.companies.length > 0) {
        newParams.set("company", filters.companies.join(","));
      } else {
        newParams.delete("company");
      }
      if (filters.platform.length > 0) {
        newParams.set("platform", filters.platform.join(","));
      } else {
        newParams.delete("platform");
      }
      if (filters.supervision.length > 0) {
        newParams.set("supervision", filters.supervision.join(","));
      } else {
        newParams.delete("supervision");
      }
      if (filters.access.length > 0) {
        newParams.set("access", filters.access.join(","));
      } else {
        newParams.delete("access");
      }
      if (filters.fares.length > 0) {
        newParams.set("fares", filters.fares.join(","));
      } else {
        newParams.delete("fares");
      }
      if (filters.directBooking.length > 0) {
        newParams.set("directBooking", filters.directBooking.join(","));
      } else {
        newParams.delete("directBooking");
      }

      // Update date
      const today = new Date();
      const isToday =
        currentTimelineDate.toDateString() === today.toDateString();
      if (!isToday) {
        newParams.set("date", currentTimelineDate.toISOString().split("T")[0]);
      } else {
        newParams.delete("date");
      }

      // Update selected area
      if (selectedArea) {
        newParams.set("selected", selectedArea.id);
      } else {
        newParams.delete("selected");
      }

      // Update map viewport
      if (mapViewport) {
        newParams.set(
          "center",
          `${mapViewport.center[0]},${mapViewport.center[1]}`
        );
        newParams.set("zoom", mapViewport.zoom.toString());
      } else {
        newParams.delete("center");
        newParams.delete("zoom");
      }

      // Only update URL if it actually changed
      if (currentParams.toString() !== newParams.toString()) {
        setSearchParams(newParams, { replace: true });
      }
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [filters, currentTimelineDate, selectedArea, mapViewport]);

  const handleServiceAreaClick = useCallback(
    (area: ServiceArea | HistoricalServiceArea | null) => {
      setSelectedArea(area);
    },
    []
  );

  const handleCloseBottomSheet = () => {
    console.log("Closing bottom sheet - exiting focus mode");
    setSelectedArea(null);

    // Remove the selected parameter from URL to prevent reopening
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.delete("selected");
    setSearchParams(newSearchParams, { replace: true });

    // Zoom out to show all filtered areas after a brief delay to let visibility updates apply
    setTimeout(() => {
      // Trigger a map event to zoom to all visible areas
      window.dispatchEvent(new CustomEvent("avmap:zoom-to-all-areas"));
    }, 100);
  };

  const handleFiltersChange = (newFilters: FiltersState) => {
    setFilters(newFilters);
  };

  const handleZoomRequest = useCallback(
    (type: "company" | "status", value: string) => {
      window.dispatchEvent(
        new CustomEvent("avmap:zoom-filter", { detail: { type, value } })
      );
    },
    []
  );

  // Active service areas state already declared above

  // Store ALL historical service states for preloading
  const [allHistoricalAreas, setAllHistoricalAreas] = useState<
    HistoricalServiceArea[]
  >([]);

  // Service-specific timeline ticks
  const [serviceTicks, setServiceTicks] = useState<
    {
      date: Date;
      type: string;
      description: string;
      details?: string;
    }[]
  >([]);
  const [serviceTimelineRange, setServiceTimelineRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  // Get deployment transitions for smooth morphing (temporarily disabled)
  const deploymentTransitions = undefined; // new Map();

  // Debug logging
  useEffect(() => {
    if (isTimelineMode) {
      console.log("Timeline mode active:", {
        currentTimelineDate: currentTimelineDate.toISOString(),
        activeHistoricalAreas: activeHistoricalAreas.length,
        activeAreas: activeHistoricalAreas.map((a) => ({
          id: a.id,
          effectiveDate: a.effectiveDate,
          endDate: a.endDate,
          company: a.company,
          name: a.name,
        })),
      });
    }
  }, [isTimelineMode, currentTimelineDate, activeHistoricalAreas]);

  // Get date range for timeline - start from first service on April 25, 2017
  const dateRange = {
    start: new Date("2017-04-25"),
    end: new Date(), // Today
  };

  // Timeline handlers
  const handleTimelineToggle = () => {
    const newTimelineMode = !isTimelineMode;
    setIsTimelineMode(newTimelineMode);
    // Note: Timeline date persists when closed (no longer resets to today)
  };

  const handleTimelineDateChange = (date: Date) => {
    setCurrentTimelineDate(date);
    // console.log("Timeline date changed to:", date);
  };

  const handleMapViewportChange = useCallback(
    (center: [number, number], zoom: number) => {
      setMapViewport({ center, zoom });
    },
    []
  );

  // PART 1: AUDIT - Log layout measurements
  useLayoutEffect(() => {
    const h = document.getElementById("app-header");
    const m = document.getElementById("main-shell");
    const headerH = h?.getBoundingClientRect().height ?? 0;

    console.log(
      "[AUDIT] headerH",
      headerH,
      "main.paddingTop",
      m ? getComputedStyle(m).paddingTop : null,
      "main.height",
      m ? getComputedStyle(m).height : null
    );
  }, []);

  // PART 2: SINGLE SOURCE OF TRUTH FOR HEADER HEIGHT
  useLayoutEffect(() => {
    function syncHeaderHeight() {
      const h = document.getElementById("app-header")?.offsetHeight ?? 56;
      document.documentElement.style.setProperty("--header-h", `${h}px`);
      window.dispatchEvent(new Event("avmap:container-resize"));
    }
    syncHeaderHeight();
    window.addEventListener("resize", syncHeaderHeight);
    return () => window.removeEventListener("resize", syncHeaderHeight);
  }, []);

  // Add page-scoped no-scroll effect
  useEffect(() => {
    document.body.classList.add("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, []);

  return (
    <div className="min-h-screen w-screen bg-background text-foreground">
      {/* Fixed header */}
      <Header isMobile={isMobile} />

      {/* Main content below header */}
      <main
        id="main-shell"
        className="w-screen max-w-none"
        style={{
          paddingTop: "var(--header-h)",
          height: "calc(100vh - var(--header-h))",
        }}
      >
        {/* Full-width map */}
        <div id="map-container" className="w-full h-full overflow-hidden">
          <Map
            historicalServiceAreas={activeHistoricalAreas}
            allHistoricalServiceAreas={allHistoricalAreas}
            deploymentTransitions={deploymentTransitions}
            filters={filters}
            isTimelineMode={isTimelineMode}
            selectedArea={selectedArea}
            onServiceAreaClick={handleServiceAreaClick}
            initialViewport={initialViewport}
            onViewportChange={handleMapViewportChange}
            className="w-full h-full"
          />
        </div>
      </main>

      {/* Floating Filters Overlay */}
      <FiltersOverlay
        page="map"
        taxonomy={taxonomy}
        state={filters}
        onChange={handleFiltersChange}
      />

      {/* Time Slider - only render when timeline mode is active and not mobile with bottom sheet open */}
      {isTimelineMode && !(isMobile && selectedArea) && (
        <TimeSlider
          startDate={dateRange.start}
          endDate={dateRange.end}
          currentDate={currentTimelineDate}
          onDateChange={handleTimelineDateChange}
          isTimelineMode={isTimelineMode}
          onTimelineModeChange={setIsTimelineMode}
        />
      )}

      {/* Timeline Date Selector - interactive button to open timeline */}
      {(() => {
        // Only show when timeline UI is closed
        if (isTimelineMode) return null;

        const dateText = currentTimelineDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        const handleTimelineOpen = () => {
          setIsTimelineMode(true);
        };

        return (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleTimelineOpen}
                  data-timeline-container
                  className="fixed z-50 flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-black/50 text-white backdrop-blur-md shadow-lg hover:bg-black/60 transition-all cursor-pointer"
                  style={{ left: "16px", bottom: "73px" }}
                >
                  <History className="h-4 w-4" />
                  <span className="text-sm font-medium">{dateText}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Open Timeline</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })()}

      {/* Bottom Sheet */}
      <BottomSheet
        serviceArea={selectedArea}
        isOpen={!!selectedArea}
        onClose={handleCloseBottomSheet}
        isTimelineMode={isTimelineMode}
        timelineDate={currentTimelineDate}
        onTimelineeDateChange={handleTimelineDateChange}
        serviceEvents={serviceTicks}
        serviceTimelineRange={serviceTimelineRange}
      />

      {/* Footer positioned at bottom - hidden on mobile */}
      {!isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-10">
          <SiteFooter />
        </div>
      )}
    </div>
  );
};

export default Index;
