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
    <div className="relative">
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarContent className="pt-16">
          <SidebarGroup>
            <SidebarGroupLabel>Filters</SidebarGroupLabel>
            <SidebarGroupContent>
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
      <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-50">
        <SidebarTrigger className="bg-background border border-border rounded-full p-1 shadow-md hover:shadow-lg transition-shadow" />
      </div>
    </div>
  );
}