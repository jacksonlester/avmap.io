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
    <Sidebar variant="sidebar" collapsible="icon" className="border-r-0 relative top-14">
      <SidebarContent className="pt-2 pr-2 bg-background overflow-y-auto">
        <SidebarGroup>
          {state !== "collapsed" && (
            <div className="pr-2 pb-2 mb-2">
              <h3 className="text-sm font-medium">Filters</h3>
            </div>
          )}
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
      
      {/* Trigger button fixed at the inner right edge of the sidebar */}
      <div className="absolute top-1/2 right-1 -translate-y-1/2 z-10">
        <SidebarTrigger className="bg-background border border-border rounded-full p-1 shadow-md hover:shadow-lg transition-shadow" />
      </div>
    </Sidebar>
  );
}