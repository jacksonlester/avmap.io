import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Map } from '@/components/Map';
import { Filters } from '@/components/Filters';
import { BottomSheet } from '@/components/BottomSheet';
import { ServiceArea, ServiceAreaData, MapFilters } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();

  // Initialize filters from URL params with all options checked by default
  const [filters, setFilters] = useState<MapFilters>(() => {
    const allCompanies = ['Waymo', 'Tesla', 'Zoox', 'May Mobility'];
    const allStatuses = ['Commercial', 'Testing', 'Pilot'];
    const companies = searchParams.get('company')?.split(',').filter(Boolean) || allCompanies;
    const statuses = searchParams.get('status')?.split(',').filter(Boolean) || allStatuses;
    return { companies, statuses };
  });

  // Load service areas data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/index.json');
        const data: ServiceAreaData = await response.json();
        setServiceAreas(data.serviceAreas);
      } catch (error) {
        console.error('Failed to load service areas:', error);
      }
    };
    loadData();
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (filters.companies.length > 0) {
      newParams.set('company', filters.companies.join(','));
    }
    if (filters.statuses.length > 0) {
      newParams.set('status', filters.statuses.join(','));
    }
    setSearchParams(newParams);
  }, [filters, setSearchParams]);

  const handleServiceAreaClick = (area: ServiceArea) => {
    setSelectedArea(area);
  };

  const handleCloseBottomSheet = () => {
    setSelectedArea(null);
  };

  const handleFiltersChange = (newFilters: MapFilters) => {
    setFilters(newFilters);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Load/save collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) setCollapsed(saved === "1");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // After width transition, tell the map to resize
  useEffect(() => {
    const panel = document.getElementById("filters-panel");
    if (!panel) return;
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName === "width") {
        window.dispatchEvent(new Event("avmap:container-resize"));
      }
    };
    panel.addEventListener("transitionend", onEnd);
    return () => panel.removeEventListener("transitionend", onEnd);
  }, []);

  return (
    <div className="min-h-screen w-screen bg-background text-foreground">
      <Header onToggleFilters={toggleFilters} isMobile={isMobile} showFilters={showFilters} />
      <main id="main-shell" className="w-screen max-w-none h-[calc(100vh-56px)]">
        <div id="map-shell" className="relative flex w-full h-full">
          {/* LEFT: Filters sidebar, pinned to the left edge */}
          {!isMobile && (
            <aside
              id="filters-panel"
              data-collapsed={collapsed}
              className="
                shrink-0 h-full overflow-auto bg-[#0b1020] text-white
                transition-[width] duration-300 ease-in-out
                w-80
                data-[collapsed=true]:w-0 data-[collapsed=true]:overflow-hidden
              "
              aria-label="Filters"
            >
              {/* Sidebar header with collapse button (visible when expanded) */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="text-sm font-medium">Filters</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="inline-flex items-center justify-center rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/10"
                  aria-label="Collapse filters"
                  title="Collapse filters"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>

              {/* Filters content */}
              <div className="p-3">
                <Filters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onClose={() => setCollapsed(true)}
                  isMobile={false}
                />
              </div>
            </aside>
          )}

          {/* PERSISTENT TOGGLE when collapsed */}
          {!isMobile && (
            <button
              id="filters-toggle"
              type="button"
              onClick={() => setCollapsed(false)}
              className="
                absolute left-2 top-1/2 -translate-y-1/2 z-40
                hidden data-[collapsed=true]:flex
                items-center gap-1 rounded-md border border-white/10 bg-[#0b1020]/90
                px-2 py-1 text-xs text-white hover:bg-[#0b1020]
              "
              data-collapsed={collapsed}
              aria-label="Expand filters"
              title="Expand filters"
            >
              <ChevronRight className="h-4 w-4" />
              Filters
            </button>
          )}

          {/* RIGHT: Map column fills all remaining width */}
          <section id="map-col" className="relative flex-1 min-w-0">
            <div id="map-container" className="absolute inset-0">
              <Map
                serviceAreas={serviceAreas}
                filters={filters}
                onServiceAreaClick={handleServiceAreaClick}
                className="w-full h-full"
              />
            </div>
          </section>

          {/* Mobile Filters Overlay */}
          {isMobile && showFilters && (
            <div className="absolute inset-0 z-40 bg-background/80 backdrop-blur-sm">
              <div className="absolute top-4 left-4 right-4">
                <Filters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onClose={toggleFilters}
                  isMobile={true}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Sheet */}
      <BottomSheet
        serviceArea={selectedArea}
        isOpen={!!selectedArea}
        onClose={handleCloseBottomSheet}
      />
    </div>
  );
};

export default Index;
