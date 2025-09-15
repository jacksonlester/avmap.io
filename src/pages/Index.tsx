import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Map } from '@/components/Map';
import { Filters } from '@/components/Filters';
import { BottomSheet } from '@/components/BottomSheet';
import { ServiceArea, ServiceAreaData, MapFilters } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronsLeft, ChevronsRight } from "lucide-react";

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
    // Tell map to resize after the width transition
    const t = setTimeout(() => window.dispatchEvent(new Event("avmap:container-resize")), 320);
    return () => clearTimeout(t);
  }, [collapsed]);

  // Compute header height and set CSS variable
  useEffect(() => {
    function setHeaderVar() {
      const h = document.getElementById('app-header')?.offsetHeight ?? 56;
      document.documentElement.style.setProperty('--header-h', `${h}px`);
      // also tell Map to resize after layout shift
      window.dispatchEvent(new Event('avmap:container-resize'));
    }
    setHeaderVar();
    window.addEventListener('resize', setHeaderVar);
    return () => window.removeEventListener('resize', setHeaderVar);
  }, []);

  // Sidebar width variable
  const sidebarWidth = collapsed ? "0px" : "20rem"; // 320px

  return (
    <div className="min-h-screen w-screen bg-background text-foreground">
      {/* Fixed header */}
      <Header onToggleFilters={toggleFilters} isMobile={isMobile} showFilters={showFilters} />
      {/* Main content below header */}
      <main
        id="main-shell"
        className="w-screen max-w-none"
        style={{
          paddingTop: 'var(--header-h)',                  // push content below header
          height: 'calc(100vh - var(--header-h))'         // fill rest of viewport
        }}
      >
        <div
          id="map-shell"
          className="relative w-full h-full"
          style={{ display: "grid", gridTemplateColumns: `${sidebarWidth} 1fr` }}
        >
          {/* LEFT: filters, flush to left edge */}
          {!isMobile && (
            <aside
              id="filters-panel"
              className="h-full overflow-auto bg-[#0b1020] text-white"
              aria-label="Filters"
            >
              {/* internal padding only for contents */}
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

          {/* RIGHT: map column */}
          <section id="map-col" className="relative min-w-0">
            <div id="map-container" className="absolute inset-0">
              <Map
                serviceAreas={serviceAreas}
                filters={filters}
                onServiceAreaClick={handleServiceAreaClick}
                className="w-full h-full"
              />
            </div>
          </section>

          {/* BOUNDARY TOGGLE HANDLE — always visible, between sidebar and map */}
          {!isMobile && (
            <button
              id="sidebar-handle"
              type="button"
              onClick={() => setCollapsed(v => !v)}
              title={collapsed ? "Show filters" : "Hide filters"}
              className="
                absolute z-[60] top-1/2 -translate-y-1/2
                flex items-center justify-center
                h-10 w-6 rounded-md border border-white/15 bg-black/40 backdrop-blur
                text-white hover:bg-black/60
              "
              style={{
                left: sidebarWidth,        // sits on the boundary; moves to 0 when collapsed
                marginLeft: "-12px"        // half the handle width so it straddles the edge
              }}
              aria-controls="filters-panel"
              aria-expanded={!collapsed}
            >
              {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </button>
          )}

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
