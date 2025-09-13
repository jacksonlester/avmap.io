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
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarContent className="pt-16">
        <div className="px-4 pb-2">
          <SidebarTrigger />
        </div>
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
  );
}