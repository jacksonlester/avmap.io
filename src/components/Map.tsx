import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ServiceArea, MapFilters, COMPANY_COLORS } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPinIcon } from 'lucide-react';
import { toast } from 'sonner';
import { OverlapPicker } from './OverlapPicker';
import { OverlapBottomSheet } from './OverlapBottomSheet';
import { useIsMobile } from '@/hooks/use-mobile';

// IMPORTANT: Set your Mapbox public token here to avoid user input.
// Protect it by restricting allowed URLs in your Mapbox dashboard.
const HARDCODED_MAPBOX_PUBLIC_TOKEN: string = '';

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
  const [overlapPicker, setOverlapPicker] = useState<{
    areas: ServiceArea[];
    position: { x: number; y: number };
  } | null>(null);
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [token, setToken] = useState<string>(() => {
    try {
      if (HARDCODED_MAPBOX_PUBLIC_TOKEN && HARDCODED_MAPBOX_PUBLIC_TOKEN.startsWith('pk.')) {
        return HARDCODED_MAPBOX_PUBLIC_TOKEN;
      }
      const saved = localStorage.getItem('mapbox_token');
      return saved || '';
    } catch {
      return HARDCODED_MAPBOX_PUBLIC_TOKEN || '';
    }
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !token) return;

    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-116.5, 35.0], // Centered on western US
      zoom: 5.5,
      projection: 'mercator' as any
    });

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

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [token]);

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
        setOverlapPicker(null);
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
        setOverlapPicker(null);
      } else if (features.length <= 5) {
        // Multiple areas - show overlap picker
        const overlappingAreas = features
          .map(feature => serviceAreas.find(area => area.id === feature.source))
          .filter((area): area is ServiceArea => area !== undefined);

        if (isMobile) {
          setOverlapPicker({ areas: overlappingAreas, position: { x: 0, y: 0 } });
        } else {
          const rect = mapContainer.current?.getBoundingClientRect();
          if (rect) {
            setOverlapPicker({
              areas: overlappingAreas,
              position: {
                x: e.point.x,
                y: e.point.y - 10
              }
            });
          }
        }
      } else {
        // Too many overlapping areas - show toast
        toast.error('Too many overlapping service areas. Try zooming in for better precision.');
        setOverlapPicker(null);
      }
    });

  }, [serviceAreas, loadedAreas, onServiceAreaClick, isMobile]);

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

  // Handle overlap picker area selection
  const handleOverlapAreaSelect = (area: ServiceArea) => {
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

    setOverlapPicker(null);
    onServiceAreaClick(area);
  };

  // Handle area hover for highlighting
  const handleOverlapAreaHover = (area: ServiceArea | null) => {
    if (!map.current) return;

    // Reset all areas to normal state
    serviceAreas.forEach(serviceArea => {
      if (loadedAreas.has(serviceArea.id)) {
        map.current?.setPaintProperty(`${serviceArea.id}-line`, 'line-width', 2);
        map.current?.setPaintProperty(`${serviceArea.id}-fill`, 'fill-opacity', 0.3);
      }
    });

    // Highlight the hovered area
    if (area && loadedAreas.has(area.id)) {
      map.current.setPaintProperty(`${area.id}-line`, 'line-width', 3);
      map.current.setPaintProperty(`${area.id}-fill`, 'fill-opacity', 0.5);
    }

    setHoveredAreaId(area?.id || null);
  };

  // Close overlap picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!overlapPicker || !mapContainer.current) return;

      const rect = mapContainer.current.getBoundingClientRect();
      const isOutsideMap = e.clientX < rect.left || e.clientX > rect.right || 
                          e.clientY < rect.top || e.clientY > rect.bottom;
      
      if (isOutsideMap) {
        setOverlapPicker(null);
      }
    };

    if (overlapPicker && !isMobile) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [overlapPicker, isMobile]);

  if (!token) {
    return (
      <div className={`relative ${className}`}>
        <div className="fixed left-0 right-0 top-14 bottom-0 flex items-center justify-center bg-muted/50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <div className="space-y-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <MapPinIcon className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Map Configuration Required</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  The map requires a Mapbox token to load. Contact the administrator to configure the map service.
                </p>
                <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Map preview unavailable</p>
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
      <div ref={mapContainer} className="w-full h-full relative">
        {/* Desktop overlap picker */}
        {overlapPicker && !isMobile && (
          <OverlapPicker
            overlappingAreas={overlapPicker.areas}
            position={overlapPicker.position}
            onAreaSelect={handleOverlapAreaSelect}
            onAreaHover={handleOverlapAreaHover}
          />
        )}
      </div>
      
      {/* Mobile overlap picker */}
      {isMobile && (
        <OverlapBottomSheet
          overlappingAreas={overlapPicker?.areas || []}
          isOpen={!!overlapPicker}
          onAreaSelect={handleOverlapAreaSelect}
          onClose={() => setOverlapPicker(null)}
        />
      )}
    </div>
  );
}