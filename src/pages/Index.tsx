import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Map } from '@/components/Map';
import { BottomSheet } from '@/components/BottomSheet';
import { TimeSlider } from '@/components/TimeSlider';
import { FiltersOverlay, FiltersState, Taxonomy } from '@/components/filters/FiltersOverlay';
import { ServiceArea, ServiceAreaData, MapFilters, HistoricalServiceArea } from '@/types';
import { getAllServicesAtDate, getCurrentServiceAreas, getAllHistoricalServiceStates } from '@/lib/eventService';
import { loadGeometry } from '@/lib/storageService';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [currentTimelineDate, setCurrentTimelineDate] = useState<Date>(new Date());
  const [isTimelineMode, setIsTimelineMode] = useState(false);
  const [taxonomy] = useState<Taxonomy>({
    companies: ['Waymo', 'Tesla', 'Zoox', 'May Mobility'],
    platform: ['Waymo', 'Uber', 'Lyft', 'Robotaxi', 'Zoox'],
    supervision: ['Fully Autonomous', 'Safety Driver', 'Safety Attendant'],
    access: ['Yes', 'No'],
    fares: ['Yes', 'No'],
    directBooking: ['Yes', 'No']
  });
  const isMobile = useIsMobile();

  // Initialize filters from URL params with all options checked by default
  const [filters, setFilters] = useState<FiltersState>(() => {
    const allCompanies = ['Waymo', 'Tesla', 'Zoox', 'May Mobility'];
    const allPlatforms = ['Waymo', 'Uber', 'Lyft', 'Robotaxi', 'Zoox'];
    const allSupervision = ['Fully Autonomous', 'Safety Driver', 'Safety Attendant'];
    const allAccess = ['Yes', 'No'];
    const allFares = ['Yes', 'No'];
    const allDirectBooking = ['Yes', 'No'];

    return {
      companies: searchParams.get('company')?.split(',').filter(Boolean) || allCompanies,
      platform: searchParams.get('platform')?.split(',').filter(Boolean) || allPlatforms,
      supervision: searchParams.get('supervision')?.split(',').filter(Boolean) || allSupervision,
      access: searchParams.get('access')?.split(',').filter(Boolean) || allAccess,
      fares: searchParams.get('fares')?.split(',').filter(Boolean) || allFares,
      directBooking: searchParams.get('directBooking')?.split(',').filter(Boolean) || allDirectBooking,
    };
  });

  // Load current service areas from Supabase
  useEffect(() => {
    const loadCurrentServices = async () => {
      try {
        const services = await getCurrentServiceAreas();
        console.log('Loaded current services from Supabase:', services.length, services);
        console.log('Service areas with geojsonPath:', services.filter(s => s.geojsonPath).length);
        console.log('Service areas without geojsonPath:', services.filter(s => !s.geojsonPath).map(s => ({ id: s.id, name: s.name, geojsonPath: s.geojsonPath })));
        setServiceAreas(services);
      } catch (error) {
        console.error('Failed to load current service areas:', error);
      }
    };
    loadCurrentServices();
  }, []);

  // Load ALL historical service states at initialization for instant timeline scrubbing
  useEffect(() => {
    const loadAllHistoricalStates = async () => {
      try {
        console.log('Loading all historical service states for preloading...');
        const allStates = await getAllHistoricalServiceStates();
        console.log('Loaded all historical states:', allStates.length, allStates);
        console.log('Historical areas with geojsonPath:', allStates.filter(s => s.geojsonPath).length);
        console.log('Historical areas without geojsonPath:', allStates.filter(s => !s.geojsonPath).map(s => ({ id: s.id, name: s.name, geojsonPath: s.geojsonPath })));
        setAllHistoricalAreas(allStates as HistoricalServiceArea[]);
      } catch (error) {
        console.error('Failed to load all historical service states:', error);
      }
    };
    loadAllHistoricalStates();
  }, []);

  // Timeline date is initialized directly in useState above

  // Load historical service areas for timeline date using event sourcing
  useEffect(() => {
    if (!currentTimelineDate) return;

    const loadHistoricalAreas = async () => {
      try {
        const services = await getAllServicesAtDate(currentTimelineDate);
        console.log('Timeline date services:', services.length, services);
        console.log('Timeline services with geojsonPath:', services.filter(s => s.geojsonPath).length);
        setActiveHistoricalAreas(services as HistoricalServiceArea[]);
      } catch (error) {
        console.error('Failed to load historical service areas:', error);
        setActiveHistoricalAreas([]);
      }
    };

    loadHistoricalAreas();
  }, [currentTimelineDate]);

  // Update URL when filters change
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (filters.companies.length > 0) {
      newParams.set('company', filters.companies.join(','));
    }
    if (filters.platform.length > 0) {
      newParams.set('platform', filters.platform.join(','));
    }
    if (filters.supervision.length > 0) {
      newParams.set('supervision', filters.supervision.join(','));
    }
    if (filters.access.length > 0) {
      newParams.set('access', filters.access.join(','));
    }
    if (filters.fares.length > 0) {
      newParams.set('fares', filters.fares.join(','));
    }
    if (filters.directBooking.length > 0) {
      newParams.set('directBooking', filters.directBooking.join(','));
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

  // Calculate active service areas for the current timeline date using event sourcing
  const [activeHistoricalAreas, setActiveHistoricalAreas] = useState<HistoricalServiceArea[]>([]);

  // Store ALL historical service states for preloading
  const [allHistoricalAreas, setAllHistoricalAreas] = useState<HistoricalServiceArea[]>([]);


  // Get deployment transitions for smooth morphing (temporarily disabled)
  const deploymentTransitions = undefined; // new Map();

  // Debug logging
  useEffect(() => {
    if (isTimelineMode) {
      console.log('Timeline mode active:', {
        currentTimelineDate: currentTimelineDate.toISOString(),
        activeHistoricalAreas: activeHistoricalAreas.length,
        activeAreas: activeHistoricalAreas.map(a => ({
          id: a.id,
          effectiveDate: a.effectiveDate,
          endDate: a.endDate,
          company: a.company,
          name: a.name
        }))
      });
    }
  }, [isTimelineMode, currentTimelineDate, activeHistoricalAreas]);

  // Get date range for timeline - override start date to Oct 8, 2020
  const dateRange = {
    start: new Date('2020-10-08'),
    end: new Date() // Today
  };

  // Timeline handlers
  const handleTimelineToggle = () => {
    const newTimelineMode = !isTimelineMode;
    setIsTimelineMode(newTimelineMode);

    // When closing timeline mode, reset to today
    if (!newTimelineMode) {
      setCurrentTimelineDate(new Date());
    }
  };

  const handleTimelineDateChange = (date: Date) => {
    setCurrentTimelineDate(date);
    console.log('Timeline date changed to:', date);
  };

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
            historicalServiceAreas={activeHistoricalAreas}
            allHistoricalServiceAreas={allHistoricalAreas}
            deploymentTransitions={deploymentTransitions}
            filters={filters}
            isTimelineMode={isTimelineMode}
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
      />

      {/* Time Slider */}
      <TimeSlider
        startDate={dateRange.start}
        endDate={dateRange.end}
        currentDate={currentTimelineDate}
        onDateChange={handleTimelineDateChange}
        isTimelineMode={isTimelineMode}
        onTimelineModeChange={setIsTimelineMode}
      />

      {/* Bottom Sheet */}
      <BottomSheet
        serviceArea={selectedArea}
        isOpen={!!selectedArea}
        onClose={handleCloseBottomSheet}
        isTimelineMode={isTimelineMode}
        timelineDate={currentTimelineDate}
      />
    </div>
  );
};

export default Index;