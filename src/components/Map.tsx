import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ServiceArea, MapFilters, COMPANY_COLORS } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPinIcon } from 'lucide-react';
import { toast } from 'sonner';

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

  // Load token from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mapbox_token');
      if (saved) {
        setMapboxToken(saved);
      }
    } catch (error) {
      console.warn('Failed to load saved token:', error);
    }
  }, []);

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

    // Surface mapbox style/token errors
    map.current.on('error', (e) => {
      console.error('Mapbox error:', e?.error || e);
      toast.error('Map failed to load. Check token and allowed origins.');
      try { 
        localStorage.removeItem('mapbox_token'); 
        setMapboxToken('');
      } catch (error) {
        console.warn('Failed to clear token:', error);
      }
    });

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
      if (currentMap.getSource(area.id)) return;

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

        // area loaded
      } catch (error) {
        console.error(`Failed to load area ${area.id}:`, error);
      }
    });

  }, [serviceAreas, filters, tokenEntered, onServiceAreaClick]);

  // Theme change handler
  useEffect(() => {
    if (!map.current) return;

    const handleThemeChange = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const style = isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';
      
      // Store current filter state to re-apply after style change
      const currentFilters = { ...filters };
      const currentServiceAreas = [...serviceAreas];
      
      map.current?.setStyle(style);
      
      // Re-add service areas after style loads
      map.current?.on('style.load', () => {
        // Filter and re-add service areas
        const filteredAreas = currentServiceAreas.filter(area => {
          const companyMatch = currentFilters.companies.length === 0 || currentFilters.companies.includes(area.company);
          const statusMatch = currentFilters.statuses.length === 0 || currentFilters.statuses.includes(area.status);
          return companyMatch && statusMatch;
        });

        // Re-add each service area
        filteredAreas.forEach(async (area) => {
          try {
            const response = await fetch(area.geojsonPath);
            const geojson = await response.json();
            
            const companyConfig = COMPANY_COLORS[area.company];
            const color = companyConfig.color;

            // Add source
            map.current?.addSource(area.id, {
              type: 'geojson',
              data: geojson
            });

            // Add fill layer
            map.current?.addLayer({
              id: `${area.id}-fill`,
              type: 'fill',
              source: area.id,
              paint: {
                'fill-color': color,
                'fill-opacity': 0.3
              }
            });

            // Add line layer
            map.current?.addLayer({
              id: `${area.id}-line`,
              type: 'line',
              source: area.id,
              paint: {
                'line-color': color,
                'line-width': 2,
                'line-opacity': 0.8
              }
            });

            // Re-add hover effects
            map.current?.on('mouseenter', `${area.id}-fill`, () => {
              if (map.current) {
                map.current.getCanvas().style.cursor = 'pointer';
                map.current.setPaintProperty(`${area.id}-line`, 'line-width', 3);
                map.current.setPaintProperty(`${area.id}-fill`, 'fill-opacity', 0.5);
              }
            });

            map.current?.on('mouseleave', `${area.id}-fill`, () => {
              if (map.current) {
                map.current.getCanvas().style.cursor = '';
                map.current.setPaintProperty(`${area.id}-line`, 'line-width', 2);
                map.current.setPaintProperty(`${area.id}-fill`, 'fill-opacity', 0.3);
              }
            });

            // Re-add click handler
            map.current?.on('click', `${area.id}-fill`, (e) => {
              if (e.features?.[0] && map.current) {
                const bounds = new mapboxgl.LngLatBounds();
                const geometry = e.features[0].geometry as any;
                
                if (geometry.type === 'Polygon') {
                  geometry.coordinates[0].forEach((coord: [number, number]) => {
                    bounds.extend(coord);
                  });
                }
                
                map.current.fitBounds(bounds, { padding: 50 });
                onServiceAreaClick(area);
              }
            });

          } catch (error) {
            console.error(`Failed to re-load area ${area.id}:`, error);
          }
        });
      });
    };

    // Listen for theme changes
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [filters, serviceAreas, onServiceAreaClick, mapboxToken]);

  if (!mapboxToken) {
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
                    onChange={(e) => {
                      const token = e.target.value;
                      setMapboxToken(token);
                      // Auto-save as they type
                      if (token.startsWith('pk.') && token.length > 50) {
                        try {
                          localStorage.setItem('mapbox_token', token.trim());
                        } catch (error) {
                          console.warn('Failed to auto-save token:', error);
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && mapboxToken.trim()) {
                        try {
                          localStorage.setItem('mapbox_token', mapboxToken.trim());
                          setMapboxToken(mapboxToken.trim());
                        } catch (error) {
                          console.warn('Failed to save token:', error);
                        }
                      }
                    }}
                  />
                  <Button 
                    className="w-full" 
                    onClick={() => { 
                      try { 
                        localStorage.setItem('mapbox_token', mapboxToken.trim()); 
                        setMapboxToken(mapboxToken.trim());
                      } catch (error) {
                        console.warn('Failed to save token:', error);
                      }
                    }}
                    disabled={!mapboxToken.trim()}
                  >
                    Save & Load Map
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