export interface ServiceArea {
  id: string;
  name: string;
  company: string;
  status: 'Commercial' | 'Testing' | 'Pilot';
  geojsonPath: string;
  lastUpdated: string;
}

export interface ServiceAreaData {
  serviceAreas: ServiceArea[];
}

export interface MapFilters {
  companies: string[];
  statuses: string[];
}

export interface CompanyConfig {
  name: string;
  color: string;
  darkColor: string;
}

export const COMPANY_COLORS: Record<string, CompanyConfig> = {
  'Waymo': {
    name: 'Waymo',
    color: 'hsl(var(--waymo-blue))',
    darkColor: 'hsl(var(--waymo-blue-dark))'
  },
  'Tesla': {
    name: 'Tesla', 
    color: 'hsl(var(--tesla-red))',
    darkColor: 'hsl(var(--tesla-red-dark))'
  },
  'Zoox': {
    name: 'Zoox',
    color: 'hsl(var(--zoox-teal))',
    darkColor: 'hsl(var(--zoox-teal-dark))'
  },
  'May Mobility': {
    name: 'May Mobility',
    color: 'hsl(var(--may-mobility-green))',
    darkColor: 'hsl(var(--may-mobility-green-dark))'
  }
};