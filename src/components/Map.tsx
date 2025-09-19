import React, { useEffect, useRef, useState, memo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  ServiceArea,
  MapFilters,
  COMPANY_COLORS,
  HistoricalServiceArea,
} from "@/types";
import { toast } from "sonner";
import { ServiceSelector } from "./ServiceSelector";
import { createRoot } from "react-dom/client";
import { loadGeometry } from "@/lib/storageService";

// Add custom CSS for transparent popup
const popupStyle = `
  .transparent-popup .mapboxgl-popup-content {
    background: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
  .transparent-popup .mapboxgl-popup-tip {
    display: none !important;
  }
`;

// Inject the styles
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = popupStyle;
  document.head.appendChild(styleSheet);
}

// Use a restricted PUBLIC token (scopes: styles:read, tilesets:read, fonts:read; URL restricted to this domain)
mapboxgl.accessToken =
  "pk.eyJ1IjoiamFja3Nvbmxlc3RlciIsImEiOiJjbWZoajk3eTAwY3dqMnJwdG5mcGF6bTl0In0.gWVBM8D8fd0SrAq1hXH1Fg";

// Optional service area bounds (Bay Area example)
const SERVICE_BOUNDS: [number, number, number, number] = [
  -123.0, 37.2, -122.0, 38.2,
];

interface MapProps {
  serviceAreas: ServiceArea[];
  historicalServiceAreas?: HistoricalServiceArea[];
  allHistoricalServiceAreas?: HistoricalServiceArea[]; // All historical states for preloading
  deploymentTransitions?: Map<string, HistoricalServiceArea | null>;
  filters: MapFilters;
  isTimelineMode?: boolean;
  showHistoricalData?: boolean; // Whether to show historical data regardless of timeline UI state
  selectedArea?: ServiceArea | null; // Currently selected area for focus mode
  onServiceAreaClick: (serviceArea: ServiceArea | null) => void;
  initialViewport?: { center: [number, number]; zoom: number } | null;
  onViewportChange?: (center: [number, number], zoom: number) => void;
  className?: string;
}

// Helper function to convert Yes/No filters to actual data values
const convertAccessFilter = (yesNoFilters: string[], actualValue: string) => {
  if (yesNoFilters.length === 0) return true; // No filter applied
  const isPublicAccess = actualValue === "Public";
  return (
    (yesNoFilters.includes("Yes") && isPublicAccess) ||
    (yesNoFilters.includes("No") && !isPublicAccess)
  );
};

// Helper function to check platform matches (handles comma-separated values)
const checkPlatformMatch = (
  filterPlatforms: string[],
  areaPlatform: string | undefined
) => {
  if (filterPlatforms.length === 0) return true;
  if (!areaPlatform) return filterPlatforms.includes("Unknown");

  // Handle comma-separated platforms like "Uber, Waymo"
  const areaPlatforms = areaPlatform.split(",").map((p) => p.trim());
  return areaPlatforms.some((platform) => filterPlatforms.includes(platform));
};

// Helper function to calculate bounds from any GeoJSON geometry
const calculateGeometryBounds = (
  geometry: GeoJSON.Geometry
): mapboxgl.LngLatBounds => {
  const bounds = new mapboxgl.LngLatBounds();

  const addCoordinatesToBounds = (coords: unknown) => {
    if (
      Array.isArray(coords) &&
      coords.length >= 2 &&
      typeof coords[0] === "number" &&
      typeof coords[1] === "number"
    ) {
      // This is a coordinate pair [lng, lat]
      bounds.extend(coords as [number, number]);
    } else if (Array.isArray(coords)) {
      // This is an array of coordinates or coordinate arrays
      coords.forEach((coord) => addCoordinatesToBounds(coord));
    }
  };

  // Handle different geometry types
  switch (geometry.type) {
    case "Point":
      bounds.extend(geometry.coordinates as [number, number]);
      break;
    case "LineString":
    case "MultiPoint":
      addCoordinatesToBounds(geometry.coordinates);
      break;
    case "Polygon":
    case "MultiLineString":
      addCoordinatesToBounds(geometry.coordinates);
      break;
    case "MultiPolygon":
      addCoordinatesToBounds(geometry.coordinates);
      break;
    case "GeometryCollection":
      geometry.geometries.forEach((geom) => {
        const geomBounds = calculateGeometryBounds(geom);
        bounds.extend(geomBounds.getNorthEast());
        bounds.extend(geomBounds.getSouthWest());
      });
      break;
  }

  return bounds;
};

// Helper function to fit bounds with responsive padding
const fitBoundsWithResponsivePadding = (
  map: mapboxgl.Map,
  bounds: mapboxgl.LngLatBounds
) => {
  const container = map.getContainer();
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Calculate responsive padding based on screen size
  const basePadding = Math.min(containerWidth, containerHeight) * 0.1; // 10% of smaller dimension
  const minPadding = 20;
  const maxPadding = 100;
  const padding = Math.max(minPadding, Math.min(maxPadding, basePadding));

  map.fitBounds(bounds, {
    padding: padding,
    duration: 1000, // Smooth animation
  });
};

export const Map = memo(function Map({
  serviceAreas,
  historicalServiceAreas = [],
  allHistoricalServiceAreas = [],
  deploymentTransitions,
  filters,
  isTimelineMode = false,
  showHistoricalData = false,
  selectedArea = null,
  onServiceAreaClick,
  initialViewport = null,
  onViewportChange,
  className,
}: MapProps) {
  console.log("Map component rendered");

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const loadedAreas = useRef<Set<string>>(new Set());
  const loadedHistoricalAreas = useRef<Set<string>>(new Set());
  const hasAppliedInitialViewport = useRef(false);
  const [deploymentSources, setDeploymentSources] = useState<Set<string>>(
    new Set()
  );
  const activePopup = useRef<mapboxgl.Popup | null>(null);

  // Helper function to toggle service area bounds lock
  const setServiceAreaLock = (on: boolean) => {
    if (map.current) {
      map.current.setMaxBounds(on ? SERVICE_BOUNDS : null);
    }
  };

  // Initialize map
  useEffect(() => {
    console.log("Map useEffect - attempting to initialize", {
      hasContainer: !!mapContainer.current,
      hasMap: !!map.current,
      timestamp: new Date().toISOString()
    });

    if (!mapContainer.current) {
      console.log("No map container, skipping init");
      return;
    }

    // Don't recreate if map already exists
    if (map.current) {
      console.log("Map already exists, skipping init");
      return;
    }

    const initialCenter = initialViewport?.center || [-122.4, 37.8]; // San Francisco Bay Area
    const initialZoom = initialViewport?.zoom || 8;
    hasAppliedInitialViewport.current = true;

    console.log("Creating new map instance", { initialCenter, initialZoom });

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 0,
      maxZoom: 18,
      projection: "mercator",
      attributionControl: false, // Disable default attribution
      logoPosition: "top-right",
    });

    // Add attribution control in bottom-right corner, right against bottom edge
    map.current.addControl(
      new mapboxgl.AttributionControl({
        compact: true,
      }),
      "bottom-right"
    );

    // Remove any bounds restrictions by default
    map.current.setMaxBounds(null);

    // Ensure all interactions are enabled
    map.current.scrollZoom.enable();
    map.current.boxZoom.enable();
    map.current.keyboard.enable();
    map.current.dragPan.enable();
    map.current.touchZoomRotate.enable();

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    // Set dark mode style based on theme
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      map.current.setStyle("mapbox://styles/mapbox/dark-v11");
    }

    // Surface mapbox style/token errors
    map.current.on("error", (e) => {
      console.error("Mapbox error:", e?.error || e);
      toast.error("Map failed to load. Check token and allowed origins.");
    });

    // Wire up resize handling for sidebar toggle and window resize
    const shell = document.getElementById("map-shell");
    const resizeObserver = new ResizeObserver(() => {
      if (map.current) map.current.resize();
    });
    if (shell) resizeObserver.observe(shell);

    const handleWindowResize = () => {
      if (map.current) map.current.resize();
    };
    window.addEventListener("resize", handleWindowResize);

    const handleCustomResize = () => {
      if (map.current) map.current.resize();
    };
    window.addEventListener("avmap:container-resize", handleCustomResize);

    map.current.on("load", () => {
      // Only apply default bounds if no initial viewport was provided from URL
      if (!initialViewport) {
        // --- initial extent: SF, LA, Vegas, Phoenix (and Austin on wide screens) ---
        const showAustin = window.innerWidth >= 1600; // tweak threshold if you like

        // helper to build bounds from points with a little padding
        function boundsFrom(points: [number, number][]) {
          const b = new mapboxgl.LngLatBounds(points[0], points[0]);
          for (const p of points) b.extend(p);
          return b;
        }

        // key city coordinates [lng, lat]
        const SF = [-122.4194, 37.7749] as [number, number];
        const LA = [-118.2437, 34.0522] as [number, number];
        const VEGAS = [-115.1398, 36.1699] as [number, number];
        const PHOENIX = [-112.074, 33.4484] as [number, number];
        const AUSTIN = [-97.7431, 30.2672] as [number, number];

        const pts = showAustin
          ? [SF, LA, VEGAS, PHOENIX, AUSTIN]
          : [SF, LA, VEGAS, PHOENIX];

        const INITIAL_BOUNDS = boundsFrom(pts);

        // Widen to the west to give SF more breathing room
        const WEST_BOOST_DEG = 8; // push farther west so SF stays visible with filters open
        const sw0 = INITIAL_BOUNDS.getSouthWest();
        const ne0 = INITIAL_BOUNDS.getNorthEast();

        // Push the west edge farther left
        const widened = new mapboxgl.LngLatBounds(
          [sw0.lng - WEST_BOOST_DEG, sw0.lat],
          [ne0.lng, ne0.lat]
        );

        // Compute dynamic left padding based on the floating overlay width
        const overlay = document.getElementById("filters-overlay");
        const overlayW = overlay ? overlay.getBoundingClientRect().width : 0;

        // Clamp so we don't over-pad on tiny screens
        const containerW =
          (map.current?.getContainer() as HTMLDivElement).clientWidth ||
          window.innerWidth;
        const leftPad = Math.min(overlayW + 24, containerW * 0.4);

        map.current?.fitBounds(widened, {
          padding: { top: 72, right: 24, bottom: 24, left: leftPad },
          linear: true,
          duration: 0,
        });
      }

      // Function to adjust padding when overlay state changes
      function padForOverlay() {
        if (!map.current) return;
        const o = document.getElementById("filters-overlay");
        const w = o ? o.getBoundingClientRect().width : 0;
        const cw = (map.current.getContainer() as HTMLDivElement).clientWidth;
        const lp = Math.min(w + 24, cw * 0.4);
        map.current.setPadding({ top: 72, right: 24, bottom: 24, left: lp });
      }

      // Call after overlay mounts/toggles and on resize
      window.addEventListener("resize", padForOverlay);

      // IMPORTANT: do this only once; do not re-apply on resize so user pans freely.

      if (map.current) map.current.resize();
    });

    // Track viewport changes for URL synchronization
    let viewportTimeoutId: NodeJS.Timeout;
    if (onViewportChange && map.current) {
      const handleViewportChange = () => {
        if (!map.current) return;

        // Debounce viewport updates to avoid excessive URL updates
        clearTimeout(viewportTimeoutId);
        viewportTimeoutId = setTimeout(() => {
          if (map.current && onViewportChange) {
            const center = map.current.getCenter();
            const zoom = map.current.getZoom();
            onViewportChange([center.lng, center.lat], zoom);
          }
        }, 500); // 500ms debounce
      };

      map.current.on("moveend", handleViewportChange);
      map.current.on("zoomend", handleViewportChange);
    }

    // Cleanup
    return () => {
      console.log("Map cleanup - destroying map instance");
      clearTimeout(viewportTimeoutId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("avmap:container-resize", handleCustomResize);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Remove all dependencies to prevent re-mounting

  // Handle initial viewport changes after map is created (without re-mounting)
  useEffect(() => {
    if (!map.current || !initialViewport || hasAppliedInitialViewport.current) return;

    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();

    // Only update if the viewport has changed significantly
    const centerChanged = Math.abs(currentCenter.lng - initialViewport.center[0]) > 0.01 ||
                         Math.abs(currentCenter.lat - initialViewport.center[1]) > 0.01;
    const zoomChanged = Math.abs(currentZoom - initialViewport.zoom) > 0.1;

    if (centerChanged || zoomChanged) {
      map.current.setCenter(initialViewport.center);
      map.current.setZoom(initialViewport.zoom);
    }

    hasAppliedInitialViewport.current = true;
  }, [initialViewport]);

  // Load all service areas once when map is ready
  useEffect(() => {
    if (!map.current) return;

    const currentMap = map.current;

    // Load all service areas that haven't been loaded yet
    serviceAreas.forEach(async (area) => {
      if (loadedAreas.current.has(area.id)) return;

      // Skip areas without geojsonPath
      if (!area.geojsonPath) {
        console.warn(`Service area ${area.id} has no geojsonPath, skipping...`);
        return;
      }

      try {
        // Check if source already exists
        if (currentMap.getSource(area.id)) {
          console.log(`Source ${area.id} already exists, skipping...`);
          loadedAreas.current.add(area.id);
          return;
        }

        // Double check - if we're already marked as loaded, skip
        if (loadedAreas.current.has(area.id)) {
          console.log(`Area ${area.id} already marked as loaded, skipping...`);
          return;
        }

        const geojson = await loadGeometry(area.geojsonPath);

        const companyConfig = COMPANY_COLORS[area.company];
        const color = companyConfig.color;

        // Add source
        currentMap.addSource(area.id, {
          type: "geojson",
          data: geojson,
        });

        // Add fill layer (check if it already exists)
        if (!currentMap.getLayer(`${area.id}-fill`)) {
          currentMap.addLayer({
            id: `${area.id}-fill`,
            type: "fill",
            source: area.id,
            paint: {
              "fill-color": color,
              "fill-opacity": 0.3,
            },
            layout: {
              visibility: "visible",
            },
          });
        }

        // Add line layer (check if it already exists)
        if (!currentMap.getLayer(`${area.id}-line`)) {
          currentMap.addLayer({
            id: `${area.id}-line`,
            type: "line",
            source: area.id,
            paint: {
              "line-color": color,
              "line-width": 2,
              "line-opacity": 0.8,
            },
            layout: {
              visibility: "visible",
            },
          });
        }

        // Add hover effects
        currentMap.on("mouseenter", `${area.id}-fill`, () => {
          currentMap.getCanvas().style.cursor = "pointer";
          currentMap.setPaintProperty(`${area.id}-line`, "line-width", 3);
          currentMap.setPaintProperty(`${area.id}-fill`, "fill-opacity", 0.5);
        });

        currentMap.on("mouseleave", `${area.id}-fill`, () => {
          currentMap.getCanvas().style.cursor = "";
          currentMap.setPaintProperty(`${area.id}-line`, "line-width", 2);
          currentMap.setPaintProperty(`${area.id}-fill`, "fill-opacity", 0.3);
        });

        // Remove individual click handlers - we'll handle clicks globally below

        // Mark as loaded
        loadedAreas.current.add(area.id);
      } catch (error) {
        console.error(`Failed to load area ${area.id}:`, error);
      }
    });

    // Add global click handler for overlap detection
    currentMap.on("click", (e) => {
      // Check if the click originated from the bottom sheet - if so, ignore it
      const clickTarget = e.originalEvent?.target as HTMLElement;
      if (clickTarget) {
        const bottomSheet = document.querySelector('[data-bottom-sheet]');
        if (bottomSheet && bottomSheet.contains(clickTarget)) {
          return;
        }
      }

      // Close any existing popup
      if (activePopup.current) {
        activePopup.current.remove();
        activePopup.current = null;
      }

      // Query all visible service area features at the click point
      const currentAreaLayers = serviceAreas
        .filter((area) => loadedAreas.current.has(area.id))
        .map((area) => `${area.id}-fill`);

      const historicalAreaLayers = historicalServiceAreas
        .filter((area) => {
          const hasGeojsonPath = !!area.geojsonPath;
          const historicalId = `historical-${area.id}-${area.geojsonPath}`;
          const isLoaded = loadedHistoricalAreas.current.has(historicalId);
          console.log(
            `Historical area ${area.id}: hasGeojsonPath=${hasGeojsonPath}, isLoaded=${isLoaded}`
          );
          return hasGeojsonPath && isLoaded;
        })
        .map((area) => `historical-${area.id}-${area.geojsonPath}-fill`);

      console.log(
        "Timeline mode click - Current layers:",
        currentAreaLayers.length,
        "Historical layers:",
        historicalAreaLayers.length
      );

      // In timeline mode, if no historical layers are available (due to missing geojsonPath),
      // fall back to current layers but use historical data for the service area details
      const allLayers =
        showHistoricalData && historicalAreaLayers.length === 0
          ? currentAreaLayers
          : [...currentAreaLayers, ...historicalAreaLayers];

      const features = currentMap.queryRenderedFeatures(e.point, {
        layers: allLayers,
      });

      if (features.length === 0) {
        return;
      }

      if (features.length === 1) {
        // Single area - behave normally
        const featureId = features[0].source as string;

        let clickedArea: ServiceArea | undefined;

        // In timeline mode, prefer historical data
        if (showHistoricalData) {
          if (featureId.startsWith("historical-")) {
            // Try to match by checking if any historical area ID is contained in the source
            const matchingHistorical = historicalServiceAreas.find((area) => {
              return featureId.includes(area.id);
            });

            if (matchingHistorical) {
              clickedArea = {
                ...matchingHistorical,
                lastUpdated:
                  matchingHistorical.lastUpdated ||
                  matchingHistorical.effectiveDate,
              } as ServiceArea;
            }
          } else {
            // For current layers in timeline mode, try to find matching historical data
            const matchingHistorical = historicalServiceAreas.find(
              (area) => area.id === featureId
            );
            if (matchingHistorical) {
              clickedArea = {
                ...matchingHistorical,
                lastUpdated:
                  matchingHistorical.lastUpdated ||
                  matchingHistorical.effectiveDate,
              } as ServiceArea;
            } else {
              // Fall back to current service area data
              clickedArea = serviceAreas.find((area) => area.id === featureId);
            }
          }
        } else {
          // Normal mode - just find the current service area
          clickedArea = serviceAreas.find((area) => area.id === featureId);
        }

        // If still not found, check historical areas (for backwards compatibility)
        if (!clickedArea) {
          if (featureId.startsWith("historical-")) {
            // Try to match by checking if any historical area ID is contained in the source
            const matchingHistorical = historicalServiceAreas.find((area) => {
              return featureId.includes(area.id);
            });

            if (matchingHistorical) {
              clickedArea = {
                ...matchingHistorical,
                lastUpdated:
                  matchingHistorical.lastUpdated ||
                  matchingHistorical.effectiveDate,
              } as ServiceArea;
            }
          }
        }

        if (clickedArea) {
          const geometry = features[0].geometry as GeoJSON.Geometry;
          const bounds = calculateGeometryBounds(geometry);
          fitBoundsWithResponsivePadding(currentMap, bounds);
          onServiceAreaClick(clickedArea);
        }
      } else if (features.length <= 5) {
        // Multiple areas - clear any existing selection first, then show service selector in popup
        onServiceAreaClick(null);

        console.log(
          "Multiple areas clicked - features found:",
          features.length
        );
        console.log(
          "Available service areas:",
          serviceAreas.map((a) => a.id)
        );
        console.log(
          "Available historical areas:",
          historicalServiceAreas.map((a) => a.id)
        );
        console.log("Is timeline mode:", isTimelineMode);

        const overlappingAreas = features
          .map((feature) => {
            let area: ServiceArea | undefined;

            // When showing historical data, prefer historical data even for current layer clicks
            if (showHistoricalData) {
              // First check if this is a historical layer
              const sourceId = feature.source as string;
              if (sourceId.startsWith("historical-")) {
                // Extract original ID from historical ID format
                // Format: historical-{id}-{geojsonPath}
                // The geojsonPath often contains the ID again, so we need to find the original service
                console.log(`Parsing historical source: ${sourceId}`);

                // Try to match against available historical areas by checking if their ID is contained in the source
                const matchingHistorical = historicalServiceAreas.find(
                  (historicalArea) => {
                    const isMatch = sourceId.includes(historicalArea.id);
                    console.log(
                      `Checking ${historicalArea.id} against ${sourceId}: ${isMatch}`
                    );
                    return isMatch;
                  }
                );

                if (matchingHistorical) {
                  console.log(
                    `Found matching historical area: ${matchingHistorical.id}`
                  );
                  area = {
                    ...matchingHistorical,
                    lastUpdated:
                      matchingHistorical.lastUpdated ||
                      matchingHistorical.effectiveDate,
                  } as ServiceArea;
                }
              } else {
                // For current layers in timeline mode, try to find matching historical data
                const matchingHistorical = historicalServiceAreas.find(
                  (historicalArea) => historicalArea.id === feature.source
                );
                if (matchingHistorical) {
                  area = {
                    ...matchingHistorical,
                    lastUpdated:
                      matchingHistorical.lastUpdated ||
                      matchingHistorical.effectiveDate,
                  } as ServiceArea;
                } else {
                  // Fall back to current service area data
                  area = serviceAreas.find(
                    (serviceArea) => serviceArea.id === feature.source
                  );
                }
              }
            } else {
              // Normal mode - just find the current service area
              area = serviceAreas.find(
                (serviceArea) => serviceArea.id === feature.source
              );
            }

            // If still not found, check historical areas (for backwards compatibility)
            if (!area) {
              const sourceId = feature.source as string;
              if (sourceId.startsWith("historical-")) {
                // Try to match by checking if any historical area ID is contained in the source
                const matchingHistorical = historicalServiceAreas.find(
                  (historicalArea) => {
                    return sourceId.includes(historicalArea.id);
                  }
                );

                if (matchingHistorical) {
                  area = {
                    ...matchingHistorical,
                    lastUpdated:
                      matchingHistorical.lastUpdated ||
                      matchingHistorical.effectiveDate,
                  } as ServiceArea;
                }
              }
            }
            console.log(
              `Feature source: ${feature.source}, found area:`,
              area ? area.id : "undefined"
            );
            return { area, feature };
          })
          .filter(
            (
              item
            ): item is {
              area: ServiceArea;
              feature: mapboxgl.MapboxGeoJSONFeature;
            } => {
              const hasArea = item.area !== undefined;
              if (!hasArea) {
                console.log(
                  `Filtering out feature with source: ${item.feature.source} - no area found`
                );
              }
              return hasArea;
            }
          );

        // Create popup container
        const popupContainer = document.createElement("div");

        console.log(
          "Overlapping areas for popup:",
          overlappingAreas.map((item) => item.area)
        );

        // Create React root and render ServiceSelector
        const root = createRoot(popupContainer);
        root.render(
          <ServiceSelector
            areas={overlappingAreas.map((item) => item.area)}
            onSelect={(area) => {
              // Find the corresponding feature for fast bounds calculation
              const areaWithFeature = overlappingAreas.find(
                (item) => item.area.id === area.id
              );
              if (areaWithFeature) {
                const geometry = areaWithFeature.feature
                  .geometry as GeoJSON.Geometry;
                const bounds = calculateGeometryBounds(geometry);
                fitBoundsWithResponsivePadding(currentMap, bounds);
              }

              onServiceAreaClick(area);

              // Close popup
              if (activePopup.current) {
                activePopup.current.remove();
                activePopup.current = null;
              }
            }}
          />
        );

        // Calculate smart positioning to ensure popup stays on screen
        const mapContainer = currentMap.getContainer();
        const mapRect = mapContainer.getBoundingClientRect();
        const clickX = e.point.x;
        const clickY = e.point.y;

        // Determine best anchor based on click position relative to viewport
        let anchor: "top" | "bottom" | "left" | "right" = "bottom";
        if (clickY < mapRect.height * 0.3) {
          // Click near top - show popup below
          anchor = "top";
        } else if (clickY > mapRect.height * 0.7) {
          // Click near bottom - show popup above
          anchor = "bottom";
        } else if (clickX < mapRect.width * 0.3) {
          // Click near left - show popup to the right
          anchor = "left";
        } else if (clickX > mapRect.width * 0.7) {
          // Click near right - show popup to the left
          anchor = "right";
        }

        // Create and show popup with calculated positioning
        const popup = new mapboxgl.Popup({
          closeButton: false,
          offset: 8,
          className: "transparent-popup",
          anchor: anchor,
          maxWidth: "300px",
        });

        popup
          .setLngLat(e.lngLat)
          .setDOMContent(popupContainer)
          .addTo(currentMap);
        activePopup.current = popup;

        // Close popup when clicking elsewhere
        popup.on("close", () => {
          root.unmount();
          activePopup.current = null;
        });
      } else {
        // Too many overlapping areas - show toast
        toast.error(
          "Too many overlapping service areas. Try zooming in for better precision."
        );
      }
    });
  }, [
    serviceAreas,
    historicalServiceAreas,
    loadedAreas,
    onServiceAreaClick,
    showHistoricalData,
    isTimelineMode,
  ]);

  // Preload ALL historical service areas at initialization for instant timeline scrubbing
  useEffect(() => {
    if (!map.current || allHistoricalServiceAreas.length === 0) return;

    console.log(
      "Preloading all historical areas into map:",
      allHistoricalServiceAreas.length
    );

    const currentMap = map.current;

    // Load all historical service areas that haven't been loaded yet
    allHistoricalServiceAreas.forEach(async (area) => {
      // Skip areas without geojsonPath
      if (!area.geojsonPath) {
        console.warn(
          `Historical service area ${area.id} has no geojsonPath, skipping...`
        );
        return;
      }

      // Use a unique ID for historical areas that includes geometry name to avoid conflicts
      // This ensures different historical versions of the same service get different layer IDs
      const historicalId = `historical-${area.id}-${area.geojsonPath}`;

      if (loadedHistoricalAreas.current.has(historicalId)) return;

      try {
        // Check if source already exists
        if (currentMap.getSource(historicalId)) {
          console.log(
            `Historical source ${historicalId} already exists, skipping...`
          );
          loadedHistoricalAreas.current.add(historicalId);
          return;
        }

        const companyConfig = COMPANY_COLORS[area.company];
        const color = companyConfig?.color || "#666666";

        // Load GeoJSON from Supabase Storage
        const geojsonData = await loadGeometry(area.geojsonPath);

        // Add source with loaded geojson
        currentMap.addSource(historicalId, {
          type: "geojson",
          data: geojsonData as GeoJSON.FeatureCollection,
        });

        // Add fill layer (check if it already exists)
        if (!currentMap.getLayer(`${historicalId}-fill`)) {
          currentMap.addLayer({
            id: `${historicalId}-fill`,
            type: "fill",
            source: historicalId,
            paint: {
              "fill-color": color,
              "fill-opacity": 0.3,
            },
            layout: {
              visibility: "none", // Hidden by default, timeline will control visibility
            },
          });
        }

        // Add line layer (check if it already exists)
        if (!currentMap.getLayer(`${historicalId}-line`)) {
          currentMap.addLayer({
            id: `${historicalId}-line`,
            type: "line",
            source: historicalId,
            paint: {
              "line-color": color,
              "line-width": 2,
              "line-opacity": 0.8,
            },
            layout: {
              visibility: "none", // Hidden by default, timeline will control visibility
            },
          });
        }

        // Add hover effects
        currentMap.on("mouseenter", `${historicalId}-fill`, () => {
          currentMap.getCanvas().style.cursor = "pointer";
          currentMap.setPaintProperty(`${historicalId}-line`, "line-width", 3);
          currentMap.setPaintProperty(
            `${historicalId}-fill`,
            "fill-opacity",
            0.5
          );
        });

        currentMap.on("mouseleave", `${historicalId}-fill`, () => {
          currentMap.getCanvas().style.cursor = "";
          currentMap.setPaintProperty(`${historicalId}-line`, "line-width", 2);
          currentMap.setPaintProperty(
            `${historicalId}-fill`,
            "fill-opacity",
            0.3
          );
        });

        // Mark as loaded
        loadedHistoricalAreas.current.add(historicalId);
        console.log(`Preloaded historical area: ${historicalId}`);
      } catch (error) {
        console.error(`Failed to preload historical area ${area.id}:`, error);
      }
    });
  }, [allHistoricalServiceAreas]);

  // Handle timeline mode toggling and focus mode separately from data updates
  useEffect(() => {
    if (!map.current) return;

    // console.log("🔍 CURRENT AREAS VISIBILITY EFFECT TRIGGERED");
    // console.log("   showHistoricalData:", showHistoricalData);
    // console.log("   serviceAreas:", serviceAreas.length);
    // console.log("   selectedArea:", selectedArea?.id || "null");
    // console.log(
    //   "   serviceAreas data:",
    //   serviceAreas.map((a) => `${a.id} (${a.company})`)
    // );

    const currentMap = map.current;
    const visibilityUpdates: Array<{
      layerId: string;
      visibility: "visible" | "none";
    }> = [];

    // Focus mode: when a service area is selected, only show that one
    const isFocusMode = !!selectedArea;

    if (showHistoricalData) {
      // Hide current service areas when showing historical data
      serviceAreas.forEach((area) => {
        const fillLayerId = `${area.id}-fill`;
        const lineLayerId = `${area.id}-line`;

        if (
          currentMap.getLayer(fillLayerId) &&
          currentMap.getLayer(lineLayerId)
        ) {
          visibilityUpdates.push(
            { layerId: fillLayerId, visibility: "none" },
            { layerId: lineLayerId, visibility: "none" }
          );
        }
      });
    } else {
      // Show current service areas when exiting timeline mode
      serviceAreas.forEach((area) => {
        const fillLayerId = `${area.id}-fill`;
        const lineLayerId = `${area.id}-line`;

        if (
          currentMap.getLayer(fillLayerId) &&
          currentMap.getLayer(lineLayerId)
        ) {
          let visibility: "visible" | "none" = "none";

          if (isFocusMode) {
            // In focus mode, show all areas but we'll handle highlighting differently
            const companyMatch =
              filters.companies.length === 0 ||
              filters.companies.includes(area.company);
            const platformMatch = checkPlatformMatch(
              filters.platform,
              area.platform
            );
            const supervisionMatch =
              filters.supervision.length === 0 ||
              filters.supervision.includes(area.supervision || "Autonomous");
            const accessMatch = convertAccessFilter(
              filters.access,
              area.access || "Public"
            );
            const faresMatch =
              filters.fares.length === 0 ||
              filters.fares.includes(area.fares || "Yes");
            const directBookingMatch =
              filters.directBooking.length === 0 ||
              filters.directBooking.includes(area.directBooking || "Yes");

            visibility =
              companyMatch &&
              platformMatch &&
              supervisionMatch &&
              accessMatch &&
              faresMatch &&
              directBookingMatch
                ? "visible"
                : "none";
          } else {
            // Normal mode - apply current filters
            const companyMatch =
              filters.companies.length === 0 ||
              filters.companies.includes(area.company);
            const platformMatch = checkPlatformMatch(
              filters.platform,
              area.platform
            );
            const supervisionMatch =
              filters.supervision.length === 0 ||
              filters.supervision.includes(area.supervision || "Autonomous");
            const accessMatch = convertAccessFilter(
              filters.access,
              area.access || "Public"
            );
            const faresMatch =
              filters.fares.length === 0 ||
              filters.fares.includes(area.fares || "Yes");
            const directBookingMatch =
              filters.directBooking.length === 0 ||
              filters.directBooking.includes(area.directBooking || "Yes");

            visibility =
              companyMatch &&
              platformMatch &&
              supervisionMatch &&
              accessMatch &&
              faresMatch &&
              directBookingMatch
                ? "visible"
                : "none";
          }

          visibilityUpdates.push(
            { layerId: fillLayerId, visibility },
            { layerId: lineLayerId, visibility }
          );
        }
      });

      // Hide all historical areas when exiting timeline mode
      loadedHistoricalAreas.current.forEach((historicalId) => {
        const fillLayerId = `${historicalId}-fill`;
        const lineLayerId = `${historicalId}-line`;

        if (
          currentMap.getLayer(fillLayerId) &&
          currentMap.getLayer(lineLayerId)
        ) {
          visibilityUpdates.push(
            { layerId: fillLayerId, visibility: "none" },
            { layerId: lineLayerId, visibility: "none" }
          );
        }
      });
    }

    // Apply visibility changes immediately for mode toggle
    visibilityUpdates.forEach(({ layerId, visibility }) => {
      try {
        const currentVisibility = currentMap.getLayoutProperty(
          layerId,
          "visibility"
        );
        if (currentVisibility !== visibility) {
          currentMap.setLayoutProperty(layerId, "visibility", visibility);
        }
      } catch (error) {
        console.warn(`Failed to update visibility for ${layerId}:`, error);
      }
    });

    // Apply highlighting for selected area in focus mode
    if (!showHistoricalData) {
      serviceAreas.forEach((area) => {
        const fillLayerId = `${area.id}-fill`;
        const lineLayerId = `${area.id}-line`;

        if (currentMap.getLayer(fillLayerId) && currentMap.getLayer(lineLayerId)) {
          try {
            if (isFocusMode && selectedArea && area.id === selectedArea.id) {
              // Highlight selected area
              currentMap.setPaintProperty(fillLayerId, "fill-opacity", 0.6);
              currentMap.setPaintProperty(lineLayerId, "line-opacity", 1.0);
              currentMap.setPaintProperty(lineLayerId, "line-width", 3);
            } else if (isFocusMode) {
              // Dim other areas when in focus mode
              currentMap.setPaintProperty(fillLayerId, "fill-opacity", 0.2);
              currentMap.setPaintProperty(lineLayerId, "line-opacity", 0.4);
              currentMap.setPaintProperty(lineLayerId, "line-width", 1.5);
            } else {
              // Normal mode - reset highlighting
              currentMap.setPaintProperty(fillLayerId, "fill-opacity", 0.4);
              currentMap.setPaintProperty(lineLayerId, "line-opacity", 0.8);
              currentMap.setPaintProperty(lineLayerId, "line-width", 2);
            }
          } catch (error) {
            console.warn(`Failed to update highlighting for ${area.id}:`, error);
          }
        }
      });
    }
  }, [showHistoricalData, serviceAreas, filters, selectedArea]);

  // Update historical areas visibility when timeline data changes (not mode toggle)
  useEffect(() => {
    if (!map.current || !showHistoricalData) return;

    // console.log("🔍 HISTORICAL VISIBILITY EFFECT TRIGGERED");
    // console.log("   showHistoricalData:", showHistoricalData);
    // console.log("   historicalServiceAreas:", historicalServiceAreas.length);
    // console.log("   selectedArea:", selectedArea?.id || "null");
    // console.log(
    //   "   historicalServiceAreas data:",
    //   historicalServiceAreas.map((a) => `${a.id} (${a.company})`)
    // );
    // console.log(
    //   "   Loaded historical areas:",
    //   loadedHistoricalAreas.current.size
    // );

    const currentMap = map.current;
    const visibilityUpdates: Array<{
      layerId: string;
      visibility: "visible" | "none";
    }> = [];

    // Filter historical areas that should be visible at the current timeline date
    const visibleHistoricalAreaIds = new Set<string>();

    const isFocusMode = !!selectedArea;

    historicalServiceAreas.forEach((area) => {
      let shouldShow = false;

      // Debug Phoenix specifically
      const isPhoenix = area.name?.toLowerCase().includes('phoenix');
      if (isPhoenix) {
        console.log("🏜️ Processing Phoenix area in Map:", {
          id: area.id,
          name: area.name,
          company: area.company,
          geojsonPath: area.geojsonPath,
          isFocusMode,
          selectedAreaId: selectedArea?.id
        });
      }

      if (isFocusMode) {
        // In focus mode, only show the selected area
        shouldShow = area.id === selectedArea.id;
      } else {
        // Normal mode - check if area passes filter criteria
        const companyMatch =
          filters.companies.length === 0 ||
          filters.companies.includes(area.company);
        const platformMatch =
          filters.platform.length === 0 ||
          filters.platform.includes(area.platform || "Unknown") ||
          // Handle comma-separated platforms like "Uber, Waymo"
          (area.platform &&
           area.platform.split(', ').some(p => filters.platform.includes(p.trim())));
        const supervisionMatch =
          filters.supervision.length === 0 ||
          filters.supervision.includes(area.supervision || "Fully Autonomous");
        const accessMatch = convertAccessFilter(
          filters.access,
          area.access || "Public"
        );

        if (isPhoenix) {
          console.log("🏜️ Phoenix filter results:", {
            companyMatch,
            platformMatch,
            supervisionMatch,
            accessMatch,
            company: area.company,
            platform: area.platform,
            supervision: area.supervision,
            access: area.access
          });
        }
        const faresMatch =
          filters.fares.length === 0 ||
          filters.fares.includes(area.fares || "Yes");
        const directBookingMatch =
          filters.directBooking.length === 0 ||
          filters.directBooking.includes(area.directBooking || "Yes");

        shouldShow =
          companyMatch &&
          platformMatch &&
          supervisionMatch &&
          accessMatch &&
          faresMatch &&
          directBookingMatch;

        if (isPhoenix) {
          console.log("🏜️ Phoenix final shouldShow decision:", shouldShow);
        }
      }

      if (shouldShow) {
        // Create the historical ID that was used when loading the area (includes geometry name)
        const historicalId = `historical-${area.id}-${area.geojsonPath}`;
        visibleHistoricalAreaIds.add(historicalId);

        if (isPhoenix) {
          console.log("🏜️ Phoenix added to visible areas with ID:", historicalId);
        }
      } else if (isPhoenix) {
        console.log("🏜️ Phoenix NOT added to visible areas - shouldShow:", shouldShow);
      }
    });

    console.log(
      "Timeline mode: Areas that should be visible:",
      visibleHistoricalAreaIds.size
    );

    // Prepare visibility updates for ALL loaded historical areas
    loadedHistoricalAreas.current.forEach((historicalId) => {
      const fillLayerId = `${historicalId}-fill`;
      const lineLayerId = `${historicalId}-line`;

      if (
        currentMap.getLayer(fillLayerId) &&
        currentMap.getLayer(lineLayerId)
      ) {
        const visibility = visibleHistoricalAreaIds.has(historicalId)
          ? "visible"
          : "none";
        visibilityUpdates.push(
          { layerId: fillLayerId, visibility },
          { layerId: lineLayerId, visibility }
        );
      }
    });

    // Apply all visibility changes in a single batch using requestAnimationFrame
    // This prevents the browser from re-rendering between each layer change
    requestAnimationFrame(() => {
      if (!currentMap.getStyle()) return; // Safety check

      visibilityUpdates.forEach(({ layerId, visibility }) => {
        try {
          // Only update if visibility actually needs to change
          const currentVisibility = currentMap.getLayoutProperty(
            layerId,
            "visibility"
          );
          if (currentVisibility !== visibility) {
            currentMap.setLayoutProperty(layerId, "visibility", visibility);
          }
        } catch (error) {
          // Layer might have been removed during batch processing
          console.warn(`Failed to update visibility for ${layerId}:`, error);
        }
      });
    });
  }, [showHistoricalData, historicalServiceAreas, filters, selectedArea]);

  // Handle smooth transitions for deployment morphing
  useEffect(() => {
    if (
      !map.current ||
      !isTimelineMode ||
      !deploymentTransitions ||
      deploymentTransitions.size === 0
    )
      return;

    const currentMap = map.current;

    // Enable transitions for smooth morphing
    // Note: setTransition method may not be available in all mapbox versions
    if ("setTransition" in currentMap) {
      (
        currentMap as unknown as {
          setTransition: (options: { duration: number; delay: number }) => void;
        }
      ).setTransition({
        duration: 300,
        delay: 0,
      });
    }

    deploymentTransitions.forEach((activeArea, deploymentId) => {
      const sourceId = `deployment-${deploymentId}`;
      const fillLayerId = `deployment-${deploymentId}-fill`;
      const lineLayerId = `deployment-${deploymentId}-line`;

      if (activeArea) {
        // Filter by all available filters
        const companyMatch =
          filters.companies.length === 0 ||
          filters.companies.includes(activeArea.company);
        const platformMatch = checkPlatformMatch(
          filters.platform,
          activeArea.platform
        );
        const supervisionMatch =
          !activeArea.supervision ||
          filters.supervision.length === 0 ||
          filters.supervision.includes(activeArea.supervision);
        const accessMatch =
          !activeArea.access ||
          convertAccessFilter(filters.access, activeArea.access);
        const faresMatch =
          !activeArea.fares ||
          filters.fares.length === 0 ||
          filters.fares.includes(activeArea.fares);
        const directBookingMatch =
          !activeArea.directBooking ||
          filters.directBooking.length === 0 ||
          filters.directBooking.includes(activeArea.directBooking);

        if (
          companyMatch &&
          platformMatch &&
          supervisionMatch &&
          accessMatch &&
          faresMatch &&
          directBookingMatch
        ) {
          const companyConfig = COMPANY_COLORS[activeArea.company];
          const color = companyConfig?.color || "#666666";

          // Create or update source
          if (!deploymentSources.has(deploymentId)) {
            // Load the geojson for this area
            loadGeometry(activeArea.geojsonPath)
              .then((geojsonData) => {
                // Check if map is still available
                if (!currentMap || !currentMap.getStyle()) return;
                // Add source
                currentMap.addSource(sourceId, {
                  type: "geojson",
                  data: geojsonData as GeoJSON.FeatureCollection,
                });

                // Add fill layer
                currentMap.addLayer({
                  id: fillLayerId,
                  type: "fill",
                  source: sourceId,
                  paint: {
                    "fill-color": color,
                    "fill-opacity": 0.3,
                  },
                  layout: {
                    visibility: "visible",
                  },
                });

                // Add line layer
                currentMap.addLayer({
                  id: lineLayerId,
                  type: "line",
                  source: sourceId,
                  paint: {
                    "line-color": color,
                    "line-width": 2,
                    "line-opacity": 0.8,
                  },
                  layout: {
                    visibility: "visible",
                  },
                });

                // Add hover effects
                currentMap.on("mouseenter", fillLayerId, () => {
                  currentMap.getCanvas().style.cursor = "pointer";
                  currentMap.setPaintProperty(lineLayerId, "line-width", 3);
                  currentMap.setPaintProperty(fillLayerId, "fill-opacity", 0.5);
                });

                currentMap.on("mouseleave", fillLayerId, () => {
                  currentMap.getCanvas().style.cursor = "";
                  currentMap.setPaintProperty(lineLayerId, "line-width", 2);
                  currentMap.setPaintProperty(fillLayerId, "fill-opacity", 0.3);
                });

                setDeploymentSources(
                  (prev) => new Set([...prev, deploymentId])
                );
              })
              .catch((error) => {
                console.error(
                  `Failed to load deployment ${deploymentId}:`,
                  error
                );
              });
          } else {
            // Update existing source data for smooth morphing
            loadGeometry(activeArea.geojsonPath)
              .then((geojsonData) => {
                // Check if map is still available
                if (!currentMap || !currentMap.getStyle()) return;
                const source = currentMap.getSource(
                  sourceId
                ) as mapboxgl.GeoJSONSource;
                if (source) {
                  source.setData(geojsonData as GeoJSON.FeatureCollection);
                }

                // Update colors in case company changed
                if (currentMap.getLayer(fillLayerId)) {
                  currentMap.setPaintProperty(fillLayerId, "fill-color", color);
                  currentMap.setPaintProperty(lineLayerId, "line-color", color);
                }

                // Show layers
                if (currentMap.getLayer(fillLayerId)) {
                  currentMap.setLayoutProperty(
                    fillLayerId,
                    "visibility",
                    "visible"
                  );
                  currentMap.setLayoutProperty(
                    lineLayerId,
                    "visibility",
                    "visible"
                  );
                }
              })
              .catch((error) => {
                console.error(
                  `Failed to update deployment ${deploymentId}:`,
                  error
                );
              });
          }
        } else {
          // Hide if filtered out
          if (currentMap.getLayer(fillLayerId)) {
            currentMap.setLayoutProperty(fillLayerId, "visibility", "none");
            currentMap.setLayoutProperty(lineLayerId, "visibility", "none");
          }
        }
      } else {
        // No active area for this deployment - hide it
        if (currentMap.getLayer(fillLayerId)) {
          currentMap.setLayoutProperty(fillLayerId, "visibility", "none");
          currentMap.setLayoutProperty(lineLayerId, "visibility", "none");
        }
      }
    });
  }, [deploymentTransitions, filters, isTimelineMode, deploymentSources]);

  // Theme change handler
  useEffect(() => {
    if (!map.current) return;

    const handleThemeChange = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const style = isDark
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/light-v11";

      // Store current loaded areas to re-add after style change
      const currentLoadedAreas = new Set(loadedAreas.current);

      map.current?.setStyle(style);

      // Re-add service areas after style loads
      map.current?.on("style.load", () => {
        // Reset loaded areas to trigger re-loading after style change
        loadedAreas.current = new Set();
        loadedHistoricalAreas.current = new Set();

        // Re-add all previously loaded service areas
        currentLoadedAreas.forEach(async (areaId) => {
          const area = serviceAreas.find((a) => a.id === areaId);
          if (!area || !area.geojsonPath) return;

          try {
            const geojson = await loadGeometry(area.geojsonPath);
            const companyConfig = COMPANY_COLORS[area.company];
            const color = companyConfig.color;

            // Add source
            map.current?.addSource(area.id, {
              type: "geojson",
              data: geojson,
            });

            // Add fill layer
            if (!map.current?.getLayer(`${area.id}-fill`)) {
              map.current?.addLayer({
                id: `${area.id}-fill`,
                type: "fill",
                source: area.id,
                paint: {
                  "fill-color": color,
                  "fill-opacity": 0.3,
                },
                layout: {
                  visibility: "visible",
                },
              });
            }

            // Add line layer
            if (!map.current?.getLayer(`${area.id}-line`)) {
              map.current?.addLayer({
                id: `${area.id}-line`,
                type: "line",
                source: area.id,
                paint: {
                  "line-color": color,
                  "line-width": 2,
                  "line-opacity": 0.8,
                },
                layout: {
                  visibility: "visible",
                },
              });
            }

            // Add hover effects
            map.current?.on("mouseenter", `${area.id}-fill`, () => {
              if (map.current) {
                map.current.getCanvas().style.cursor = "pointer";
                map.current.setPaintProperty(
                  `${area.id}-line`,
                  "line-width",
                  3
                );
                map.current.setPaintProperty(
                  `${area.id}-fill`,
                  "fill-opacity",
                  0.5
                );
              }
            });

            map.current?.on("mouseleave", `${area.id}-fill`, () => {
              if (map.current) {
                map.current.getCanvas().style.cursor = "";
                map.current.setPaintProperty(
                  `${area.id}-line`,
                  "line-width",
                  2
                );
                map.current.setPaintProperty(
                  `${area.id}-fill`,
                  "fill-opacity",
                  0.3
                );
              }
            });

            // Mark as loaded
            loadedAreas.current.add(area.id);
          } catch (error) {
            console.error(
              `Failed to reload area ${area.id} after theme change:`,
              error
            );
          }
        });

        // Re-add all previously loaded historical service areas
        const currentLoadedHistoricalAreas = new Set(
          loadedHistoricalAreas.current
        );
        currentLoadedHistoricalAreas.forEach(async (historicalId) => {
          // Find the historical area by parsing the historicalId
          const area = allHistoricalServiceAreas.find((a) => {
            const expectedId = `historical-${a.id}-${a.geojsonPath}`;
            return expectedId === historicalId;
          });

          if (!area || !area.geojsonPath) return;

          try {
            const companyConfig = COMPANY_COLORS[area.company];
            const color = companyConfig?.color || "#666666";

            // Load GeoJSON from Supabase Storage
            const geojsonData = await loadGeometry(area.geojsonPath);

            // Add source with loaded geojson
            map.current?.addSource(historicalId, {
              type: "geojson",
              data: geojsonData as GeoJSON.FeatureCollection,
            });

            // Add fill layer
            if (!map.current?.getLayer(`${historicalId}-fill`)) {
              map.current?.addLayer({
                id: `${historicalId}-fill`,
                type: "fill",
                source: historicalId,
                paint: {
                  "fill-color": color,
                  "fill-opacity": 0.3,
                },
                layout: {
                  visibility: "none", // Hidden by default, timeline will control visibility
                },
              });
            }

            // Add line layer
            if (!map.current?.getLayer(`${historicalId}-line`)) {
              map.current?.addLayer({
                id: `${historicalId}-line`,
                type: "line",
                source: historicalId,
                paint: {
                  "line-color": color,
                  "line-width": 2,
                  "line-opacity": 0.8,
                },
                layout: {
                  visibility: "none", // Hidden by default, timeline will control visibility
                },
              });
            }

            // Mark as loaded
            loadedHistoricalAreas.current.add(historicalId);
          } catch (error) {
            console.error(
              `Failed to reload historical area ${historicalId} after theme change:`,
              error
            );
          }
        });
      });
    };

    // Listen for theme changes
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [loadedAreas, serviceAreas, allHistoricalServiceAreas]);

  // Cleanup popup on unmount
  useEffect(() => {
    return () => {
      if (activePopup.current) {
        activePopup.current.remove();
        activePopup.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full">
      <div ref={mapContainer} className="w-full h-full relative" />
    </div>
  );
});
