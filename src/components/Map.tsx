import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ServiceArea, MapFilters, COMPANY_COLORS } from '@/types';
import { toast } from 'sonner';
import { ServicePicker } from './ServicePicker';

// Use a restricted PUBLIC token (scopes: styles:read, tilesets:read, fonts:read; URL restricted to this domain)
mapboxgl.accessToken = "pk.eyJ1IjoiamFja3Nvbmxlc3RlciIsImEiOiJjbWZoajk3eTAwY3dqMnJwdG5mcGF6bTl0In0.gWVBM8D8fd0SrAq1hXH1Fg";

// Optional service area bounds (Bay Area example)
const SERVICE_BOUNDS: [number, number, number, number] = [-123.4, 36.8, -121.6, 38.6];

interface MapProps {
  serviceAreas: ServiceArea[];
  filters: MapFilters;
  onServiceAreaClick: (serviceArea: ServiceArea) => void;
  className?: string;
}

export function Map({ serviceAreas, filters, onServiceAreaClick, className }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loadedAreas, setLoadedAreas] = useState<Set<string>>(new Set());
  const [servicePicker, setServicePicker] = useState<{
    areas: ServiceArea[];
    lngLat: mapboxgl.LngLat;
  } | null>(null);

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
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-122.4, 37.8], // San Francisco Bay Area
      zoom: 9,
      minZoom: 0,
      maxZoom: 18,
      projection: 'mercator' as any
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
      'top-right'
    );

    // Set dark mode style based on theme
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      map.current.setStyle('mapbox://styles/mapbox/dark-v11');
    }

    // Surface mapbox style/token errors
    map.current.on('error', (e) => {
      console.error('Mapbox error:', e?.error || e);
      toast.error('Map failed to load. Check token and allowed origins.');
    });

    // Wire up resize handling for sidebar toggle and window resize
    const shell = document.getElementById('map-shell');
    const resizeObserver = new ResizeObserver(() => {
      if (map.current) map.current.resize();
    });
    if (shell) resizeObserver.observe(shell);
    
    const handleWindowResize = () => {
      if (map.current) map.current.resize();
    };
    window.addEventListener('resize', handleWindowResize);
    
    const handleCustomResize = () => {
      if (map.current) map.current.resize();
    };
    window.addEventListener('avmap:container-resize', handleCustomResize);
    
    map.current.on('load', () => {
      // --- initial extent: SF, LA, Vegas, Phoenix (and Austin on wide screens) ---
      const showAustin = window.innerWidth >= 1600; // tweak threshold if you like

      // helper to build bounds from points with a little padding
      function boundsFrom(points: [number, number][]) {
        const b = new mapboxgl.LngLatBounds(points[0], points[0]);
        for (const p of points) b.extend(p);
        return b;
      }

      // key city coordinates [lng, lat]
      const SF      = [-122.4194, 37.7749] as [number, number];
      const LA      = [-118.2437, 34.0522] as [number, number];
      const VEGAS   = [-115.1398, 36.1699] as [number, number];
      const PHOENIX = [-112.0740, 33.4484] as [number, number];
      const AUSTIN  = [-97.7431,  30.2672] as [number, number];

      const pts = showAustin ? [SF, LA, VEGAS, PHOENIX, AUSTIN]
                             : [SF, LA, VEGAS, PHOENIX];

      const INITIAL_BOUNDS = boundsFrom(pts);

      map.current?.fitBounds(INITIAL_BOUNDS, {
        padding: { top: 72, right: 24, bottom: 24, left: 24 }, // keep UI off edges
        linear: true,
        duration: 0
      });

      // IMPORTANT: do this only once; do not re-apply on resize so user pans freely.
      
      if (map.current) map.current.resize();
    });

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('avmap:container-resize', handleCustomResize);
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
          type: 'geojson',
          data: geojson
        });

        // Add fill layer
        currentMap.addLayer({
          id: `${area.id}-fill`,
          type: 'fill',
          source: area.id,
          paint: {
            'fill-color': color,
            'fill-opacity': 0.3
          },
          layout: {
            visibility: 'visible'
          }
        });

        // Add line layer
        currentMap.addLayer({
          id: `${area.id}-line`,
          type: 'line',
          source: area.id,
          paint: {
            'line-color': color,
            'line-width': 2,
            'line-opacity': 0.8
          },
          layout: {
            visibility: 'visible'
          }
        });

        // Add hover effects
        currentMap.on('mouseenter', `${area.id}-fill`, () => {
          currentMap.getCanvas().style.cursor = 'pointer';
          currentMap.setPaintProperty(`${area.id}-line`, 'line-width', 3);
          currentMap.setPaintProperty(`${area.id}-fill`, 'fill-opacity', 0.5);
        });

        currentMap.on('mouseleave', `${area.id}-fill`, () => {
          currentMap.getCanvas().style.cursor = '';
          currentMap.setPaintProperty(`${area.id}-line`, 'line-width', 2);
          currentMap.setPaintProperty(`${area.id}-fill`, 'fill-opacity', 0.3);
        });

        // Remove individual click handlers - we'll handle clicks globally below

        // Mark as loaded
        setLoadedAreas(prev => new Set([...prev, area.id]));
      } catch (error) {
        console.error(`Failed to load area ${area.id}:`, error);
      }
    });

    // Add global click handler for overlap detection
    currentMap.on('click', (e) => {
      // Query all visible service area features at the click point
      const features = currentMap.queryRenderedFeatures(e.point, {
        layers: serviceAreas
          .filter(area => loadedAreas.has(area.id))
          .map(area => `${area.id}-fill`)
      });

      if (features.length === 0) {
        setServicePicker(null);
        return;
      }

      if (features.length === 1) {
        // Single area - behave normally
        const featureId = features[0].source as string;
        const clickedArea = serviceAreas.find(area => area.id === featureId);
        
        if (clickedArea) {
          const bounds = new mapboxgl.LngLatBounds();
          const geometry = features[0].geometry as any;
          
          if (geometry.type === 'Polygon') {
            geometry.coordinates[0].forEach((coord: [number, number]) => {
              bounds.extend(coord);
            });
          }
          
          currentMap.fitBounds(bounds, { padding: 50 });
          onServiceAreaClick(clickedArea);
        }
        setServicePicker(null);
      } else if (features.length <= 5) {
        // Multiple areas - show service picker
        const overlappingAreas = features
          .map(feature => serviceAreas.find(area => area.id === feature.source))
          .filter((area): area is ServiceArea => area !== undefined);

        setServicePicker({
          areas: overlappingAreas,
          lngLat: e.lngLat
        });
      } else {
        // Too many overlapping areas - show toast
        toast.error('Too many overlapping service areas. Try zooming in for better precision.');
        setServicePicker(null);
      }
    });

  }, [serviceAreas, loadedAreas, onServiceAreaClick]);

  // Update visibility based on filters
  useEffect(() => {
    if (!map.current) return;

    const currentMap = map.current;

    // Filter service areas based on current filters
    const filteredAreas = serviceAreas.filter(area => {
      const companyMatch = filters.companies.length === 0 || filters.companies.includes(area.company);
      const statusMatch = filters.statuses.length === 0 || filters.statuses.includes(area.status);
      return companyMatch && statusMatch;
    });

    const filteredAreaIds = new Set(filteredAreas.map(area => area.id));
    
    // Update visibility for all loaded areas
    serviceAreas.forEach(area => {
      const fillLayerId = `${area.id}-fill`;
      const lineLayerId = `${area.id}-line`;
      
      if (currentMap.getLayer(fillLayerId) && currentMap.getLayer(lineLayerId)) {
        const visibility = filteredAreaIds.has(area.id) ? 'visible' : 'none';
        currentMap.setLayoutProperty(fillLayerId, 'visibility', visibility);
        currentMap.setLayoutProperty(lineLayerId, 'visibility', visibility);
      }
    });

  }, [serviceAreas, filters, loadedAreas]);

  // Theme change handler
  useEffect(() => {
    if (!map.current) return;

    const handleThemeChange = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const style = isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';
      
      // Store current loaded areas to re-add after style change
      const currentLoadedAreas = new Set(loadedAreas);
      
      map.current?.setStyle(style);
      
      // Re-add service areas after style loads
      map.current?.on('style.load', () => {
        // Reset loaded areas to trigger re-loading after style change
        setLoadedAreas(new Set());
      });
    };

    // Listen for theme changes
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [loadedAreas]);

  // Handle service picker area selection
  const handleServiceAreaSelect = (area: ServiceArea) => {
    if (!map.current) return;

    // Fit bounds to the selected area
    const source = map.current.getSource(area.id) as mapboxgl.GeoJSONSource;
    if (source) {
      const bounds = new mapboxgl.LngLatBounds();
      // Get the source data to calculate bounds
      fetch(area.geojsonPath)
        .then(response => response.json())
        .then(geojson => {
          if (geojson.features?.[0]?.geometry?.type === 'Polygon') {
            geojson.features[0].geometry.coordinates[0].forEach((coord: [number, number]) => {
              bounds.extend(coord);
            });
            map.current?.fitBounds(bounds, { padding: 50 });
          }
        });
    }

    setServicePicker(null);
    onServiceAreaClick(area);
  };


  return (
    <div className="w-full h-full">
      <div ref={mapContainer} className="w-full h-full relative">
        {/* Service picker for multiple overlapping areas */}
        {servicePicker && map.current && (
          <ServicePicker
            map={map.current}
            lngLat={servicePicker.lngLat}
            options={servicePicker.areas}
            onSelect={handleServiceAreaSelect}
            onClose={() => setServicePicker(null)}
          />
        )}
      </div>
    </div>
  );
}