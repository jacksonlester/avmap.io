import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ServiceArea, MapFilters, COMPANY_COLORS, HistoricalServiceArea } from "@/types";
import { toast } from "sonner";
import { ServiceSelector } from "./ServiceSelector";
import { createRoot } from "react-dom/client";
import { loadGeometry } from "@/lib/storageService";

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
  onServiceAreaClick: (serviceArea: ServiceArea) => void;
  className?: string;
}

// Helper function to convert Yes/No filters to actual data values
const convertAccessFilter = (yesNoFilters: string[], actualValue: string) => {
  if (yesNoFilters.length === 0) return true; // No filter applied
  const isPublicAccess = actualValue === 'Public';
  return (yesNoFilters.includes('Yes') && isPublicAccess) || (yesNoFilters.includes('No') && !isPublicAccess);
};

export function Map({
  serviceAreas,
  historicalServiceAreas = [],
  allHistoricalServiceAreas = [],
  deploymentTransitions,
  filters,
  isTimelineMode = false,
  onServiceAreaClick,
  className,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const loadedAreas = useRef<Set<string>>(new Set());
  const loadedHistoricalAreas = useRef<Set<string>>(new Set());
  const [deploymentSources, setDeploymentSources] = useState<Set<string>>(new Set());
  const activePopup = useRef<mapboxgl.Popup | null>(null);

  // Helper function to toggle service area bounds lock
  const setServiceAreaLock = (on: boolean) => {
    if (map.current) {
      map.current.setMaxBounds(on ? SERVICE_BOUNDS : null);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-122.4, 37.8], // San Francisco Bay Area
      zoom: 8,
      minZoom: 0,
      maxZoom: 18,
      projection: "mercator",
      attributionControl: false, // Disable default attribution
    });

    // Add attribution control in bottom-right corner
    map.current.addControl(new mapboxgl.AttributionControl({
      compact: true
    }), 'bottom-right');

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
      const WEST_BOOST_DEG = 6; // ~100–110 km around SF; tweak as needed
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

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("avmap:container-resize", handleCustomResize);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Load all service areas once when map is ready
  useEffect(() => {
    if (!map.current) return;


    const currentMap = map.current;

    // Load all service areas that haven't been loaded yet
    serviceAreas.forEach(async (area) => {
      if (loadedAreas.current.has(area.id)) return;

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

        const geojson = await loadGeometry(area.geometryName);

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
        .filter((area) => loadedHistoricalAreas.current.has(`historical-${area.id}`))
        .map((area) => `historical-${area.id}-fill`);

      const allLayers = [...currentAreaLayers, ...historicalAreaLayers];

      const features = currentMap.queryRenderedFeatures(e.point, {
        layers: allLayers,
      });

      if (features.length === 0) {
        return;
      }

      if (features.length === 1) {
        // Single area - behave normally
        const featureId = features[0].source as string;

        // Look in current service areas first, then historical areas
        let clickedArea = serviceAreas.find((area) => area.id === featureId);

        // If not found in current areas, check historical areas
        if (!clickedArea) {
          // Extract original ID from historical ID
          const originalId = featureId.replace('historical-', '');
          const historicalArea = historicalServiceAreas.find((area) => area.id === originalId);
          if (historicalArea) {
            clickedArea = {
              ...historicalArea,
              lastUpdated: historicalArea.lastUpdated || historicalArea.effectiveDate
            } as ServiceArea;
          }
        }

        if (clickedArea) {
          const bounds = new mapboxgl.LngLatBounds();
          const geometry = features[0].geometry as GeoJSON.Geometry;

          if (geometry.type === "Polygon") {
            geometry.coordinates[0].forEach((coord: [number, number]) => {
              bounds.extend(coord);
            });
          }

          currentMap.fitBounds(bounds, { padding: 50 });
          onServiceAreaClick(clickedArea);
        }
      } else if (features.length <= 5) {
        // Multiple areas - show service selector in popup
        const overlappingAreas = features
          .map((feature) => {
            let area = serviceAreas.find((serviceArea) => serviceArea.id === feature.source);
            // If not found in current areas, check historical areas
            if (!area) {
              // Extract original ID from historical ID format: historical-{id}-{geometryName}
              const sourceId = feature.source as string;
              if (sourceId.startsWith('historical-')) {
                // Split by '-' and take everything except 'historical' and the last part (geometry name)
                const parts = sourceId.split('-');
                if (parts.length >= 3) {
                  // Reconstruct the original ID (everything between 'historical-' and the last '-{geometryName}')
                  const originalId = parts.slice(1, -1).join('-');
                  const historicalArea = historicalServiceAreas.find((historicalArea) => historicalArea.id === originalId);
                  if (historicalArea) {
                    area = {
                      ...historicalArea,
                      lastUpdated: historicalArea.lastUpdated || historicalArea.effectiveDate
                    } as ServiceArea;
                  }
                }
              }
            }
            return area;
          })
          .filter((area): area is ServiceArea => area !== undefined);

        // Create popup container
        const popupContainer = document.createElement("div");

        // Create React root and render ServiceSelector
        const root = createRoot(popupContainer);
        root.render(
          <ServiceSelector
            areas={overlappingAreas}
            onSelect={(area) => {
              // Fit bounds to selected area
              const bounds = new mapboxgl.LngLatBounds();
              loadGeometry(area.geometryName)
                .then((geojson) => {
                  if (geojson.features?.[0]?.geometry?.type === "Polygon") {
                    geojson.features[0].geometry.coordinates[0].forEach(
                      (coord: [number, number]) => {
                        bounds.extend(coord);
                      }
                    );
                    currentMap.fitBounds(bounds, { padding: 50 });
                  }
                })

              onServiceAreaClick(area);

              // Close popup
              if (activePopup.current) {
                activePopup.current.remove();
                activePopup.current = null;
              }
            }}
          />
        );

        // Create and show popup
        const popup = new mapboxgl.Popup({
          closeButton: false,
          offset: 8,
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
  }, [serviceAreas, historicalServiceAreas, loadedAreas, onServiceAreaClick, isTimelineMode]);

  // Preload ALL historical service areas at initialization for instant timeline scrubbing
  useEffect(() => {
    if (!map.current || allHistoricalServiceAreas.length === 0) return;

    console.log('Preloading all historical areas into map:', allHistoricalServiceAreas.length);

    const currentMap = map.current;

    // Load all historical service areas that haven't been loaded yet
    allHistoricalServiceAreas.forEach(async (area) => {
      // Use a unique ID for historical areas that includes geometry name to avoid conflicts
      // This ensures different historical versions of the same service get different layer IDs
      const historicalId = `historical-${area.id}-${area.geometryName}`;

      if (loadedHistoricalAreas.current.has(historicalId)) return;

      try {
        // Check if source already exists
        if (currentMap.getSource(historicalId)) {
          console.log(`Historical source ${historicalId} already exists, skipping...`);
          loadedHistoricalAreas.current.add(historicalId);
          return;
        }

        const companyConfig = COMPANY_COLORS[area.company];
        const color = companyConfig?.color || '#666666';

        // Load GeoJSON from Supabase Storage
        const geojsonData = await loadGeometry(area.geometryName);

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
          currentMap.setPaintProperty(`${historicalId}-fill`, "fill-opacity", 0.5);
        });

        currentMap.on("mouseleave", `${historicalId}-fill`, () => {
          currentMap.getCanvas().style.cursor = "";
          currentMap.setPaintProperty(`${historicalId}-line`, "line-width", 2);
          currentMap.setPaintProperty(`${historicalId}-fill`, "fill-opacity", 0.3);
        });

        // Mark as loaded
        loadedHistoricalAreas.current.add(historicalId);
        console.log(`Preloaded historical area: ${historicalId}`);
      } catch (error) {
        console.error(`Failed to preload historical area ${area.id}:`, error);
      }
    });
  }, [allHistoricalServiceAreas]);


  // Update visibility for historical areas (timeline mode) with batching and debouncing
  useEffect(() => {
    if (!map.current || !isTimelineMode) return;

    console.log('Timeline mode: Updating visibility. Historical areas:', historicalServiceAreas.length);
    console.log('Timeline mode: Loaded historical areas:', loadedHistoricalAreas.current.size);

    const currentMap = map.current;

    // Batch all visibility changes together to prevent flickering
    const visibilityUpdates: Array<{ layerId: string; visibility: string }> = [];

    // Hide current service areas in timeline mode
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

    // Filter historical areas that should be visible at the current timeline date
    const visibleHistoricalAreaIds = new Set<string>();

    historicalServiceAreas.forEach((area) => {
      // Check if area passes filter criteria
      const companyMatch = filters.companies.length === 0 || filters.companies.includes(area.company);
      const platformMatch = filters.platform.length === 0 || filters.platform.includes(area.platform || 'Unknown');
      const supervisionMatch = filters.supervision.length === 0 || filters.supervision.includes(area.supervision || 'Fully Autonomous');
      const accessMatch = convertAccessFilter(filters.access, area.access || 'Public');
      const faresMatch = filters.fares.length === 0 || filters.fares.includes(area.fares || 'Yes');
      const directBookingMatch = filters.directBooking.length === 0 || filters.directBooking.includes(area.directBooking || 'Yes');

      const passesFilters = companyMatch && platformMatch && supervisionMatch && accessMatch && faresMatch && directBookingMatch;

      if (passesFilters) {
        // Create the historical ID that was used when loading the area (includes geometry name)
        visibleHistoricalAreaIds.add(`historical-${area.id}-${area.geometryName}`);
      }
    });

    console.log('Timeline mode: Areas that should be visible:', visibleHistoricalAreaIds.size);

    // Prepare visibility updates for ALL loaded historical areas
    loadedHistoricalAreas.current.forEach((historicalId) => {
      const fillLayerId = `${historicalId}-fill`;
      const lineLayerId = `${historicalId}-line`;

      if (
        currentMap.getLayer(fillLayerId) &&
        currentMap.getLayer(lineLayerId)
      ) {
        const visibility = visibleHistoricalAreaIds.has(historicalId) ? "visible" : "none";
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
          currentMap.setLayoutProperty(layerId, "visibility", visibility);
        } catch (error) {
          // Layer might have been removed during batch processing
          console.warn(`Failed to update visibility for ${layerId}:`, error);
        }
      });
    });
  }, [historicalServiceAreas, filters, isTimelineMode]);

  // Show current service areas when timeline mode is disabled with batching
  useEffect(() => {
    if (!map.current || isTimelineMode) return;

    const currentMap = map.current;
    const visibilityUpdates: Array<{ layerId: string; visibility: string }> = [];

    // Show current service areas and hide historical ones when not in timeline mode
    serviceAreas.forEach((area) => {
      const fillLayerId = `${area.id}-fill`;
      const lineLayerId = `${area.id}-line`;

      if (
        currentMap.getLayer(fillLayerId) &&
        currentMap.getLayer(lineLayerId)
      ) {
        // Filter by current filters
        const companyMatch = filters.companies.length === 0 || filters.companies.includes(area.company);
        const platformMatch = filters.platform.length === 0 || filters.platform.includes(area.platform || 'Unknown');
        const supervisionMatch = filters.supervision.length === 0 || filters.supervision.includes(area.supervision || 'Fully Autonomous');
        const accessMatch = convertAccessFilter(filters.access, area.access || 'Public');
        const faresMatch = filters.fares.length === 0 || filters.fares.includes(area.fares || 'Yes');
        const directBookingMatch = filters.directBooking.length === 0 || filters.directBooking.includes(area.directBooking || 'Yes');

        const visibility = (companyMatch && platformMatch && supervisionMatch && accessMatch && faresMatch && directBookingMatch) ? "visible" : "none";

        visibilityUpdates.push(
          { layerId: fillLayerId, visibility },
          { layerId: lineLayerId, visibility }
        );
      }
    });

    // Hide all historical areas when not in timeline mode
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

    // Apply all visibility changes in a single batch
    requestAnimationFrame(() => {
      if (!currentMap.getStyle()) return; // Safety check

      visibilityUpdates.forEach(({ layerId, visibility }) => {
        try {
          currentMap.setLayoutProperty(layerId, "visibility", visibility);
        } catch (error) {
          console.warn(`Failed to update visibility for ${layerId}:`, error);
        }
      });
    });
  }, [isTimelineMode, serviceAreas, filters]);

  // Handle smooth transitions for deployment morphing
  useEffect(() => {
    if (!map.current || !isTimelineMode || !deploymentTransitions || deploymentTransitions.size === 0) return;

    const currentMap = map.current;

    // Enable transitions for smooth morphing
    // Note: setTransition method may not be available in all mapbox versions
    if ('setTransition' in currentMap) {
      (currentMap as unknown as { setTransition: (options: { duration: number; delay: number }) => void }).setTransition({
        duration: 300,
        delay: 0
      });
    }

    deploymentTransitions.forEach((activeArea, deploymentId) => {
      const sourceId = `deployment-${deploymentId}`;
      const fillLayerId = `deployment-${deploymentId}-fill`;
      const lineLayerId = `deployment-${deploymentId}-line`;

      if (activeArea) {
        // Filter by all available filters
        const companyMatch = filters.companies.length === 0 || filters.companies.includes(activeArea.company);
        const platformMatch = !activeArea.platform || filters.platform.length === 0 || filters.platform.includes(activeArea.platform);
        const supervisionMatch = !activeArea.supervision || filters.supervision.length === 0 || filters.supervision.includes(activeArea.supervision);
        const accessMatch = !activeArea.access || convertAccessFilter(filters.access, activeArea.access);
        const faresMatch = !activeArea.fares || filters.fares.length === 0 || filters.fares.includes(activeArea.fares);
        const directBookingMatch = !activeArea.directBooking || filters.directBooking.length === 0 || filters.directBooking.includes(activeArea.directBooking);

        if (companyMatch && platformMatch && supervisionMatch && accessMatch && faresMatch && directBookingMatch) {
          const companyConfig = COMPANY_COLORS[activeArea.company];
          const color = companyConfig?.color || '#666666';

          // Create or update source
          if (!deploymentSources.has(deploymentId)) {
            // Load the geojson for this area
            loadGeometry(activeArea.geometryName)
              .then(geojsonData => {
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

              setDeploymentSources(prev => new Set([...prev, deploymentId]));
            }).catch(error => {
              console.error(`Failed to load deployment ${deploymentId}:`, error);
            });
          } else {
            // Update existing source data for smooth morphing
            loadGeometry(activeArea.geometryName)
              .then(geojsonData => {
                // Check if map is still available
                if (!currentMap || !currentMap.getStyle()) return;
              const source = currentMap.getSource(sourceId) as mapboxgl.GeoJSONSource;
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
                currentMap.setLayoutProperty(fillLayerId, "visibility", "visible");
                currentMap.setLayoutProperty(lineLayerId, "visibility", "visible");
              }
            }).catch(error => {
              console.error(`Failed to update deployment ${deploymentId}:`, error);
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
      const currentLoadedAreas = new Set(loadedAreas);

      map.current?.setStyle(style);

      // Re-add service areas after style loads
      map.current?.on("style.load", () => {
        // Reset loaded areas to trigger re-loading after style change
        setLoadedAreas(new Set());
      });
    };

    // Listen for theme changes
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [loadedAreas]);

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
}
