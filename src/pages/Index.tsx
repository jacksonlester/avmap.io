import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Map } from '@/components/Map';
import { BottomSheet } from '@/components/BottomSheet';
import { FiltersOverlay, FiltersState, Taxonomy } from '@/components/filters/FiltersOverlay';
import { ServiceArea, ServiceAreaData, MapFilters } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [taxonomy] = useState<Taxonomy>({
    topic: [],
    companies: ['Waymo', 'Tesla', 'Zoox', 'May Mobility'],
    geography: [],
    tags: [],
    type: []
  });
  const isMobile = useIsMobile();

  // Initialize filters from URL params with all options checked by default
  const [filters, setFilters] = useState<FiltersState>(() => {
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

  const handleFiltersChange = (newFilters: FiltersState) => {
    setFilters(newFilters);
  };

  const handleZoomRequest = useCallback((type: 'company' | 'status', value: string) => {
    window.dispatchEvent(new CustomEvent('avmap:zoom-filter', { detail: { type, value } }));
  }, []);

  // PART 1: AUDIT - Log layout measurements
  useLayoutEffect(() => {
    const h = document.getElementById('app-header');
    const m = document.getElementById('main-shell');
    const headerH = h?.getBoundingClientRect().height ?? 0;
    
    console.log('[AUDIT] headerH', headerH,
      'main.paddingTop', m ? getComputedStyle(m).paddingTop : null,
      'main.height', m ? getComputedStyle(m).height : null
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

  // Add page-scoped no-scroll effect
  useEffect(() => {
    document.body.classList.add("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, []);

  return (
    <div className="min-h-screen w-screen bg-background text-foreground">
      {/* Fixed header */}
      <Header />
      
      {/* Main content below header */}
      <main
        id="main-shell"
        className="w-screen max-w-none"
        style={{
          paddingTop: 'var(--header-h)',
          height: 'calc(100vh - var(--header-h))'
        }}
      >
        {/* Full-width map */}
        <div id="map-container" className="w-full h-full overflow-hidden">
          <Map
            serviceAreas={serviceAreas}
            filters={{ companies: filters.companies, statuses: filters.statuses }}
            onServiceAreaClick={handleServiceAreaClick}
            className="w-full h-full"
          />
        </div>
      </main>

      {/* Floating Filters Overlay */}
      <FiltersOverlay
        page="map"
        taxonomy={taxonomy}
        state={filters}
        onChange={handleFiltersChange}
        onZoomRequest={handleZoomRequest}
      />

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