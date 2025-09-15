import { useState, useEffect, useLayoutEffect } from 'react';
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

  // PART 1: AUDIT - Log layout measurements
  useLayoutEffect(() => {
    const h = document.getElementById('app-header');
    const m = document.getElementById('main-shell');
    const s = document.getElementById('filters-panel');
    const headerH = h?.getBoundingClientRect().height ?? 0;
    const sidebarStyle = s ? getComputedStyle(s) : null;
    
    console.log('[AUDIT] headerH', headerH,
      'main.paddingTop', m ? getComputedStyle(m).paddingTop : null,
      'main.height', m ? getComputedStyle(m).height : null,
      'sidebar.top', s?.getBoundingClientRect().top,
      'sidebar.position', sidebarStyle?.position,
      'sidebar.hasFixed?', sidebarStyle?.position === 'fixed',
      'sidebar.hasTop0?', sidebarStyle?.top === '0px',
      'sidebar.hasInsetY0?', s?.classList.contains('inset-y-0')
    );
  }, []);

  // PART 2: SINGLE SOURCE OF TRUTH FOR HEADER HEIGHT
  useLayoutEffect(() => {
    function syncHeaderHeight() {
      const h = document.getElementById('app-header')?.offsetHeight ?? 56;
      document.documentElement.style.setProperty('--header-h', `${h}px`);
      window.dispatchEvent(new Event('avmap:container-resize'));
    }
    syncHeaderHeight();
    window.addEventListener('resize', syncHeaderHeight);
    return () => window.removeEventListener('resize', syncHeaderHeight);
  }, []);

  // PART 6: ASSERTIONS TO CATCH REGRESSIONS
  useLayoutEffect(() => {
    const h = document.getElementById('app-header');
    const s = document.getElementById('filters-panel');
    if (h && s) {
      const headerBottom = h.getBoundingClientRect().bottom;
      const sidebarTop = s.getBoundingClientRect().top;
      if (sidebarTop < headerBottom - 1) {
        console.warn('[ASSERT] Sidebar is under the header. Ensure #filters-panel is not fixed and main has paddingTop var(--header-h).');
      } else {
        console.log('[ASSERT] ✓ Sidebar correctly positioned below header');
      }
    }
  }, [collapsed]);

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
          {/* LEFT: filters, flush to left edge - NO FIXED POSITIONING */}
          {!isMobile && (
            <aside
              id="filters-panel"
              className="h-full overflow-y-auto bg-[#0b1020] text-white"
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
            <div id="map-container" className="absolute inset-0 overflow-visible">
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
              className="absolute z-[60] h-10 w-6 flex items-center justify-center rounded-md border border-white/15 bg-black/40 text-white hover:bg-black/60"
              style={{
                left: collapsed ? '0px' : '20rem',
                marginLeft: '-12px',                 // straddle the edge
                top: 'calc(var(--header-h) + 50% - 20px)' // centered within content area, below header
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
