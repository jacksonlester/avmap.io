import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ServiceArea, MapFilters, COMPANY_COLORS } from '@/types';

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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Replace with your actual Mapbox public token
    // This is safe for frontend use - just set up domain restrictions in your Mapbox dashboard
    mapboxgl.accessToken = 'pk.eyJ1IjoieW91cm1hcGJveHVzZXJuYW1lIiwiYSI6InlvdXJhY2Nlc3N0b2tlbiJ9.example';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-116.5, 35.0], // Centered on western US
      zoom: 5.5,
      projection: 'mercator' as any
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
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
    });

    // Cleanup
    return () => {
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

        // Add click handler
        currentMap.on('click', `${area.id}-fill`, (e) => {
          if (e.features?.[0]) {
            // Fit bounds to the clicked area
            const bounds = new mapboxgl.LngLatBounds();
            const geometry = e.features[0].geometry as any;
            
            if (geometry.type === 'Polygon') {
              geometry.coordinates[0].forEach((coord: [number, number]) => {
                bounds.extend(coord);
              });
            }
            
            currentMap.fitBounds(bounds, { padding: 50 });
            onServiceAreaClick(area);
          }
        });

        // Mark as loaded
        setLoadedAreas(prev => new Set([...prev, area.id]));
      } catch (error) {
        console.error(`Failed to load area ${area.id}:`, error);
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

  }, [serviceAreas, filters]);

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

  return (
    <div className={className}>
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}