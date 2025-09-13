import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ServiceArea, MapFilters, COMPANY_COLORS } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPinIcon } from 'lucide-react';

interface MapProps {
  serviceAreas: ServiceArea[];
  filters: MapFilters;
  onServiceAreaClick: (serviceArea: ServiceArea) => void;
  className?: string;
}

export function Map({ serviceAreas, filters, onServiceAreaClick, className }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [tokenEntered, setTokenEntered] = useState(false);
  const [loadedAreas, setLoadedAreas] = useState<Set<string>>(new Set());

  // Initialize map when token is provided
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;
    
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

    setTokenEntered(true);

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken]);

  // Load and display service areas
  useEffect(() => {
    if (!map.current || !tokenEntered) return;

    const currentMap = map.current;

    // Filter service areas based on current filters
    const filteredAreas = serviceAreas.filter(area => {
      const companyMatch = filters.companies.length === 0 || filters.companies.includes(area.company);
      const statusMatch = filters.statuses.length === 0 || filters.statuses.includes(area.status);
      return companyMatch && statusMatch;
    });

    // Remove existing layers and sources for all areas first
    serviceAreas.forEach(area => {
      const fillLayerId = `${area.id}-fill`;
      const lineLayerId = `${area.id}-line`;
      
      if (currentMap.getLayer(fillLayerId)) {
        currentMap.removeLayer(fillLayerId);
      }
      if (currentMap.getLayer(lineLayerId)) {
        currentMap.removeLayer(lineLayerId);
      }
      if (currentMap.getSource(area.id)) {
        currentMap.removeSource(area.id);
      }
    });

    // Add filtered areas to map
    filteredAreas.forEach(async (area) => {
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

        setLoadedAreas(prev => new Set(prev).add(area.id));
      } catch (error) {
        console.error(`Failed to load area ${area.id}:`, error);
      }
    });

  }, [serviceAreas, filters, tokenEntered, onServiceAreaClick, loadedAreas]);

  // Theme change handler
  useEffect(() => {
    if (!map.current) return;

    const handleThemeChange = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const style = isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';
      map.current?.setStyle(style);
    };

    // Listen for theme changes
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [tokenEntered]);

  if (!tokenEntered) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Enter Mapbox Token</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter your Mapbox public token to load the map. You can get one at{' '}
                  <a 
                    href="https://mapbox.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    mapbox.com
                  </a>
                </p>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="pk.eyJ1IjoieW91cnVzZXJuYW1lIiwi..."
                    value={mapboxToken}
                    onChange={(e) => setMapboxToken(e.target.value)}
                  />
                  <Button 
                    className="w-full" 
                    onClick={() => setTokenEntered(true)}
                    disabled={!mapboxToken.trim()}
                  >
                    Load Map
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}