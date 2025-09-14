import { Filters } from '@/components/Filters';
import { MapFilters } from '@/types';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
}

export function AppSidebar({ filters, onFiltersChange }: AppSidebarProps) {
  const { state } = useSidebar();

  return (
    <div className="relative z-50">
      <Sidebar variant="sidebar" collapsible="icon" className="border-r-0 z-50">
        <SidebarContent className="pt-16 pr-2 z-50 bg-background">
          <SidebarGroup className="z-50">
            <SidebarGroupLabel className="pr-2 z-50 bg-background">Filters</SidebarGroupLabel>
            <SidebarGroupContent className="pr-2 z-50 bg-background">
              {state !== "collapsed" && (
                <Filters 
                  filters={filters}
                  onFiltersChange={onFiltersChange}
                />
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      
      {/* Trigger button on the right edge */}
      <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-[60]">
        <SidebarTrigger className="bg-background border border-border rounded-full p-1 shadow-md hover:shadow-lg transition-shadow" />
      </div>
    </div>
  );
}