import { useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
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

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  // Initialize selected area from URL
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);

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

        if (center.length === 2 && !isNaN(center[0]) && !isNaN(center[1]) && !isNaN(zoom)) {
          return { center, zoom };
        }
      } catch (error) {
        console.warn("Failed to parse map viewport from URL:", error);
      }
    }
    return null;
  });

  // Stabilize initial viewport - only use mapViewport for the initial setup, not for continuous updates
  const initialViewport = useMemo(() => mapViewport, []);  // Only use the initial value
  const [taxonomy] = useState<Taxonomy>({
    companies: ["Waymo", "Tesla", "Zoox", "May Mobility"],
    platform: ["Waymo", "Uber", "Lyft", "Robotaxi", "Zoox"],
    supervision: ["Autonomous", "Safety Driver", "Safety Attendant"],
    access: ["Yes", "No"],
    fares: ["Yes", "No"],
    directBooking: ["Yes", "No"],
  });
  const isMobile = useIsMobile();

  // Memoize showHistoricalData to prevent unnecessary re-renders
  const showHistoricalData = useMemo(() => {
    const today = new Date();
    return currentTimelineDate.toDateString() !== today.toDateString();
  }, [currentTimelineDate]);

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

  // Load current service areas from Supabase
  useEffect(() => {
    const loadCurrentServices = async () => {
      try {
        const services = await getCurrentServiceAreas();
        // console.log(
        //   "Loaded current services from Supabase:",
        //   services.length,
        //   services
        // );
        // console.log(
        //   "Service areas with geojsonPath:",
        //   services.filter((s) => s.geojsonPath).length
        // );
        // console.log(
        //   "Service areas without geojsonPath:",
        //   services
        //     .filter((s) => !s.geojsonPath)
        //     .map((s) => ({
        //       id: s.id,
        //       name: s.name,
        //       geojsonPath: s.geojsonPath,
        //     }))
        // );
        setServiceAreas(services);
      } catch (error) {
        console.error("Failed to load current service areas:", error);
      }
    };
    loadCurrentServices();
  }, []);

  // Load ALL historical service states at initialization for instant timeline scrubbing
  useEffect(() => {
    const loadAllHistoricalStates = async () => {
      try {
        // console.log("Loading all historical service states for preloading...");
        const allStates = await getAllHistoricalServiceStates();
        // console.log(
        //   "Loaded all historical states:",
        //   allStates.length,
        //   allStates
        // );
        // console.log(
        //   "Historical areas with geojsonPath:",
        //   allStates.filter((s) => s.geojsonPath).length
        // );
        // console.log(
        //   "Historical areas without geojsonPath:",
        //   allStates
        //     .filter((s) => !s.geojsonPath)
        //     .map((s) => ({
        //       id: s.id,
        //       name: s.name,
        //       geojsonPath: s.geojsonPath,
        //     }))
        // );
        setAllHistoricalAreas(allStates as HistoricalServiceArea[]);
      } catch (error) {
        console.error("Failed to load all historical service states:", error);
      }
    };
    loadAllHistoricalStates();
  }, []);

  // Timeline date is initialized directly in useState above

  // Load historical service areas for timeline date using event sourcing
  useEffect(() => {
    if (!currentTimelineDate) return;

    const loadHistoricalAreas = async () => {
      try {
        const services = await getAllServicesAtDate(currentTimelineDate);

        // Debug logging for Phoenix issue
        console.log("📅 Timeline date:", currentTimelineDate.toISOString());
        console.log("🔍 Total services loaded:", services.length);

        const phoenixServices = services.filter(s =>
          s.name?.toLowerCase().includes('phoenix') ||
          s.city?.toLowerCase().includes('phoenix')
        );
        console.log("🏜️ Phoenix services found:", phoenixServices.length, phoenixServices);

        // Debug Phoenix geometry data specifically
        phoenixServices.forEach(service => {
          console.log("🏜️ Phoenix service details:", {
            id: service.id,
            name: service.name,
            geojsonPath: service.geojsonPath,
            geometry_name: service.geometry_name,
            effectiveDate: service.effectiveDate,
            endDate: service.endDate,
            isActive: service.isActive
          });
        });

        setActiveHistoricalAreas(services as HistoricalServiceArea[]);
      } catch (error) {
        console.error("Failed to load historical service areas:", error);
        setActiveHistoricalAreas([]);
      }
    };

    loadHistoricalAreas();
  }, [currentTimelineDate]);

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

  // Load selected area from URL once service areas are available
  useEffect(() => {
    if (selectedAreaIdFromUrl && serviceAreas.length > 0 && !selectedArea) {
      const areaFromUrl = serviceAreas.find(area => area.id === selectedAreaIdFromUrl);
      if (areaFromUrl) {
        setSelectedArea(areaFromUrl);
      }
    }
  }, [selectedAreaIdFromUrl, serviceAreas, selectedArea]);

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
      const isToday = currentTimelineDate.toDateString() === today.toDateString();
      if (!isToday) {
        newParams.set("date", currentTimelineDate.toISOString().split('T')[0]);
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
        newParams.set("center", `${mapViewport.center[0]},${mapViewport.center[1]}`);
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

  const handleServiceAreaClick = useCallback((area: ServiceArea | null) => {
    setSelectedArea(area);
  }, []);

  const handleCloseBottomSheet = () => {
    console.log("Closing bottom sheet");
    setSelectedArea(null);

    // Remove the selected parameter from URL to prevent reopening
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.delete("selected");
    setSearchParams(newSearchParams, { replace: true });
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

  // Calculate active service areas for the current timeline date using event sourcing
  const [activeHistoricalAreas, setActiveHistoricalAreas] = useState<
    HistoricalServiceArea[]
  >([]);

  // Store ALL historical service states for preloading
  const [allHistoricalAreas, setAllHistoricalAreas] = useState<
    HistoricalServiceArea[]
  >([]);

  // Service-specific timeline ticks
  const [serviceTicks, setServiceTicks] = useState<{
    date: Date;
    type: string;
    description: string;
    details?: string;
  }[]>([]);
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

  const handleMapViewportChange = useCallback((center: [number, number], zoom: number) => {
    setMapViewport({ center, zoom });
  }, []);

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
            serviceAreas={serviceAreas}
            historicalServiceAreas={activeHistoricalAreas}
            allHistoricalServiceAreas={allHistoricalAreas}
            deploymentTransitions={deploymentTransitions}
            filters={filters}
            isTimelineMode={isTimelineMode}
            showHistoricalData={showHistoricalData}
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

      {/* Time Slider - only render when timeline mode is active */}
      {isTimelineMode && (
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

        const today = new Date();
        const isToday =
          currentTimelineDate.toDateString() === today.toDateString();

        const dateText = isToday
          ? "Today"
          : currentTimelineDate.toLocaleDateString("en-US", {
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
                  className="fixed z-50 px-4 py-2 rounded-full text-sm font-medium shadow-lg backdrop-blur-md border border-white/10 bg-black/50 text-white/90 hover:bg-black/60 hover:text-white transition-all cursor-pointer"
                  style={{ left: "16px", bottom: "73px" }}
                >
                  {dateText}
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

      {/* Footer positioned at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-10">
        <SiteFooter />
      </div>
    </div>
  );
};

export default Index;
