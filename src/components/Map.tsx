import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ServiceArea, MapFilters, COMPANY_COLORS, HistoricalServiceArea } from "@/types";
import { toast } from "sonner";
import { ServiceSelector } from "./ServiceSelector";
import { createRoot } from "react-dom/client";

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
  deploymentTransitions?: Map<string, HistoricalServiceArea | null>;
  filters: MapFilters;
  isTimelineMode?: boolean;
  onServiceAreaClick: (serviceArea: ServiceArea) => void;
  className?: string;
}

export function Map({
  serviceAreas,
  historicalServiceAreas = [],
  deploymentTransitions,
  filters,
  isTimelineMode = false,
  onServiceAreaClick,
  className,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loadedAreas, setLoadedAreas] = useState<Set<string>>(new Set());
  const [loadedHistoricalAreas, setLoadedHistoricalAreas] = useState<Set<string>>(new Set());
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
    });

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
      if (loadedAreas.has(area.id)) return;

      try {
        const response = await fetch(area.geojsonPath);
        const geojson = await response.json();

        const companyConfig = COMPANY_COLORS[area.company];
        const color = companyConfig.color;

        // Add source
        currentMap.addSource(area.id, {
          type: "geojson",
          data: geojson,
        });

        // Add fill layer
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

        // Add line layer
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
        setLoadedAreas((prev) => new Set([...prev, area.id]));
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
      const features = currentMap.queryRenderedFeatures(e.point, {
        layers: serviceAreas
          .filter((area) => loadedAreas.has(area.id))
          .map((area) => `${area.id}-fill`),
      });

      if (features.length === 0) {
        return;
      }

      if (features.length === 1) {
        // Single area - behave normally
        const featureId = features[0].source as string;
        const clickedArea = serviceAreas.find((area) => area.id === featureId);

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
          .map((feature) =>
            serviceAreas.find((area) => area.id === feature.source)
          )
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
              fetch(area.geojsonPath)
                .then((response) => response.json())
                .then((geojson) => {
                  if (geojson.features?.[0]?.geometry?.type === "Polygon") {
                    geojson.features[0].geometry.coordinates[0].forEach(
                      (coord: [number, number]) => {
                        bounds.extend(coord);
                      }
                    );
                    currentMap.fitBounds(bounds, { padding: 50 });
                  }
                });

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
  }, [serviceAreas, loadedAreas, onServiceAreaClick]);

  // Load historical service areas (always load them, control visibility separately)
  useEffect(() => {
    if (!map.current) return;

    const currentMap = map.current;

    // Load all historical service areas that haven't been loaded yet
    historicalServiceAreas.forEach(async (area) => {
      if (loadedHistoricalAreas.has(area.id)) return;

      try {
        const companyConfig = COMPANY_COLORS[area.company];
        const color = companyConfig?.color || '#666666';

        // Load GeoJSON from external file
        let geojsonData;
        if (area.geojson) {
          geojsonData = area.geojson;
        } else {
          const response = await fetch(area.geojsonPath);
          geojsonData = await response.json();
        }

        // Add source with loaded geojson
        currentMap.addSource(area.id, {
          type: "geojson",
          data: geojsonData as GeoJSON.FeatureCollection,
        });

        // Add fill layer
        currentMap.addLayer({
          id: `${area.id}-fill`,
          type: "fill",
          source: area.id,
          paint: {
            "fill-color": color,
            "fill-opacity": 0.3,
          },
          layout: {
            visibility: "none", // Hidden by default, timeline will control visibility
          },
        });

        // Add line layer
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
            visibility: "none", // Hidden by default, timeline will control visibility
          },
        });

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

        // Mark as loaded
        setLoadedHistoricalAreas((prev) => new Set([...prev, area.id]));
      } catch (error) {
        console.error(`Failed to load historical area ${area.id}:`, error);
      }
    });
  }, [historicalServiceAreas, loadedHistoricalAreas]);


  // Update visibility for historical areas (timeline mode)
  useEffect(() => {
    if (!map.current || !isTimelineMode) return;

    const currentMap = map.current;

    // Hide current service areas in timeline mode
    serviceAreas.forEach((area) => {
      const fillLayerId = `${area.id}-fill`;
      const lineLayerId = `${area.id}-line`;

      if (
        currentMap.getLayer(fillLayerId) &&
        currentMap.getLayer(lineLayerId)
      ) {
        currentMap.setLayoutProperty(fillLayerId, "visibility", "none");
        currentMap.setLayoutProperty(lineLayerId, "visibility", "none");
      }
    });

    // Filter historical areas based on current filters
    const filteredHistoricalAreas = historicalServiceAreas.filter((area) => {
      const companyMatch =
        filters.companies.length === 0 ||
        filters.companies.includes(area.company);
      const statusMatch =
        filters.statuses.length === 0 || filters.statuses.includes(area.status);
      return companyMatch && statusMatch;
    });

    const filteredHistoricalAreaIds = new Set(filteredHistoricalAreas.map((area) => area.id));

    // Update visibility for ALL loaded historical areas (not just currently active ones)
    loadedHistoricalAreas.forEach((areaId) => {
      const fillLayerId = `${areaId}-fill`;
      const lineLayerId = `${areaId}-line`;

      if (
        currentMap.getLayer(fillLayerId) &&
        currentMap.getLayer(lineLayerId)
      ) {
        const visibility = filteredHistoricalAreaIds.has(areaId) ? "visible" : "none";
        currentMap.setLayoutProperty(fillLayerId, "visibility", visibility);
        currentMap.setLayoutProperty(lineLayerId, "visibility", visibility);
      }
    });
  }, [historicalServiceAreas, filters, loadedHistoricalAreas, isTimelineMode, serviceAreas]);

  // Show current service areas when timeline mode is disabled
  useEffect(() => {
    if (!map.current || isTimelineMode) return;

    const currentMap = map.current;

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
        const statusMatch = filters.statuses.length === 0 || filters.statuses.includes(area.status);
        const visibility = (companyMatch && statusMatch) ? "visible" : "none";

        currentMap.setLayoutProperty(fillLayerId, "visibility", visibility);
        currentMap.setLayoutProperty(lineLayerId, "visibility", visibility);
      }
    });

    // Hide all historical areas when not in timeline mode
    loadedHistoricalAreas.forEach((areaId) => {
      const fillLayerId = `${areaId}-fill`;
      const lineLayerId = `${areaId}-line`;

      if (
        currentMap.getLayer(fillLayerId) &&
        currentMap.getLayer(lineLayerId)
      ) {
        currentMap.setLayoutProperty(fillLayerId, "visibility", "none");
        currentMap.setLayoutProperty(lineLayerId, "visibility", "none");
      }
    });
  }, [isTimelineMode, serviceAreas, filters, loadedAreas, loadedHistoricalAreas]);

  // Handle smooth transitions for deployment morphing
  useEffect(() => {
    if (!map.current || !isTimelineMode || !deploymentTransitions || deploymentTransitions.size === 0) return;

    const currentMap = map.current;

    // Enable transitions for smooth morphing
    currentMap.setTransition({
      duration: 300,
      delay: 0
    });

    deploymentTransitions.forEach((activeArea, deploymentId) => {
      const sourceId = `deployment-${deploymentId}`;
      const fillLayerId = `deployment-${deploymentId}-fill`;
      const lineLayerId = `deployment-${deploymentId}-line`;

      if (activeArea) {
        // Filter by company and status
        const companyMatch = filters.companies.length === 0 || filters.companies.includes(activeArea.company);
        const statusMatch = filters.statuses.length === 0 || filters.statuses.includes(activeArea.status);

        if (companyMatch && statusMatch) {
          const companyConfig = COMPANY_COLORS[activeArea.company];
          const color = companyConfig?.color || '#666666';

          // Create or update source
          if (!deploymentSources.has(deploymentId)) {
            // Load the geojson for this area
            fetch(activeArea.geojsonPath)
              .then(response => {
                if (!response.ok) throw new Error(`Failed to fetch ${activeArea.geojsonPath}`);
                return response.json();
              })
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
            fetch(activeArea.geojsonPath)
              .then(response => {
                if (!response.ok) throw new Error(`Failed to fetch ${activeArea.geojsonPath}`);
                return response.json();
              })
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
