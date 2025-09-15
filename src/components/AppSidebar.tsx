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
      <Sidebar variant="sidebar" collapsible="icon" className="border-r-0">
        <SidebarContent className="pt-20 pr-2 bg-background">
          <SidebarGroup>
            <SidebarGroupLabel className="pr-2 bg-background border-b pb-2 mb-4">Filters</SidebarGroupLabel>
            <SidebarGroupContent className="pr-2">
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
      
      {/* Trigger button on the sidebar edge */}
      <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 z-10">
        <SidebarTrigger className="bg-background border border-border rounded-full p-1 shadow-md hover:shadow-lg transition-shadow" />
      </div>
    </div>
  );
}