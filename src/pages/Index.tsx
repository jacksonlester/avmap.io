import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Map } from '@/components/Map';
import { Filters } from '@/components/Filters';
import { BottomSheet } from '@/components/BottomSheet';
import { AppSidebar } from '@/components/AppSidebar';
import { ServiceArea, ServiceAreaData, MapFilters } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [showFilters, setShowFilters] = useState(false);
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

  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen bg-background w-full">
        <Header onToggleFilters={toggleFilters} isMobile={isMobile} showFilters={showFilters} />
        
        <main className="w-full h-[calc(100vh-56px)]">
          <div id="map-shell" className="flex w-full h-full">
            {/* Desktop Sidebar */}
            {!isMobile && (
              <AppSidebar 
                filters={filters}
                onFiltersChange={handleFiltersChange}
              />
            )}

            {/* MAP COLUMN — must grow to full width */}
            <section className="relative flex-1 min-w-0">
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
    </SidebarProvider>
  );
};

export default Index;
