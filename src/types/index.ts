export interface ServiceArea {
  id: string;
  name: string;
  company: string;
  platform: string;
  access: 'Public' | 'Waitlist';
  supervision: 'Autonomous' | 'Safety Driver' | 'Safety Attendant';
  fares: 'Yes' | 'No';
  directBooking: 'Yes' | 'No';
  status: 'Active' | 'Testing' | 'Deprecated';
  geojsonPath: string;
  lastUpdated: string;
  vehicleTypes?: string;
}

export interface HistoricalServiceArea {
  id: string;
  deploymentId: string;
  name: string;
  version: string;
  effectiveDate: string;
  endDate?: string;
  company: string;
  platform: string;
  access: 'Public' | 'Waitlist';
  supervision: 'Autonomous' | 'Safety Driver' | 'Safety Attendant';
  fares: 'Yes' | 'No';
  directBooking: 'Yes' | 'No';
  status: 'Active' | 'Testing' | 'Deprecated';
  geojsonPath: string;
  lastUpdated?: string;
  vehicleTypes?: string;
  geojson?: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      properties: Record<string, any>;
      geometry: Record<string, any>;
    }>;
  };
  notes?: string;
}

export interface ServiceAreaData {
  serviceAreas: ServiceArea[];
}

export interface HistoricalServiceAreaData {
  [key: string]: HistoricalServiceArea;
}

export interface MapFilters {
  companies: string[];
  platform: string[];
  supervision: string[];
  access: string[];
  fares: string[];
  directBooking: string[];
}

export interface CompanyConfig {
  name: string;
  color: string;
}

export const COMPANY_COLORS: Record<string, CompanyConfig> = {
  'Waymo': {
    name: 'Waymo',
    color: '#4285F4'
  },
  'Tesla': {
    name: 'Tesla',
    color: '#E31937'
  },
  'Zoox': {
    name: 'Zoox',
    color: '#00D9FF'
  },
  'May Mobility': {
    name: 'May Mobility',
    color: '#00B04F'
  }
};

export interface ServiceLink {
  label: string;
  url: string;
  type: 'operator' | 'booking';
}

// Static links that don't change with timeline - mapped by company + service name
export const SERVICE_LINKS: Record<string, ServiceLink[]> = {
  'Waymo SF': [
    { label: 'Service information from Waymo', url: 'https://waymo.com/rides/san-francisco/', type: 'operator' }
  ],
  'Waymo Austin': [
    { label: 'Service information from Waymo', url: 'https://waymo.com/waymo-on-uber/', type: 'operator' },
    { label: 'Service information from Uber', url: 'https://www.uber.com/us/en/u/waymo-on-uber/', type: 'booking' }
  ],
  'Waymo Atlanta': [
    { label: 'Service information from Waymo', url: 'https://waymo.com/waymo-on-uber/', type: 'operator' },
    { label: 'Service information from Uber', url: 'https://www.uber.com/us/en/u/waymo-on-uber/', type: 'booking' }
  ],
  'Waymo Phoenix': [
    { label: 'Service information from Waymo', url: 'https://waymo.com/rides/phoenix/', type: 'operator' },
    { label: 'Service information from Uber', url: 'https://www.uber.com/newsroom/waymo-on-uber/', type: 'booking' }
  ],
  'Waymo Los Angeles': [
    { label: 'Service information from Waymo', url: 'https://waymo.com/rides/los-angeles/', type: 'operator' }
  ],
  'Waymo Silicon Valley': [
    { label: 'Service information from Google', url: 'https://support.google.com/waymo/answer/15976820?hl=en', type: 'operator' }
  ],
  'Zoox Las Vegas': [
    { label: 'Service information from Zoox', url: 'https://zoox.com/las-vegas/', type: 'operator' }
  ],
  'May Mobility Atlanta': [
    { label: 'Service information from May Mobility', url: 'https://maymobility.com/locations/atlanta-georgia/', type: 'operator' },
    { label: 'Service information from Lyft', url: 'https://www.lyft.com/autonomous/maymobility', type: 'booking' }
  ],
  'Tesla Bay Area': [
    { label: 'Service information from Tesla', url: 'https://www.tesla.com/support/robotaxi/', type: 'operator' }
  ],
  'Tesla Austin': [
    { label: 'Service information from Tesla', url: 'https://www.tesla.com/support/robotaxi/', type: 'operator' }
  ],
  // Add variations for common service names
  'Waymo LA': [
    { label: 'Service information from Waymo', url: 'https://waymo.com/rides/los-angeles/', type: 'operator' }
  ],
  'Waymo San Francisco': [
    { label: 'Service information from Waymo', url: 'https://waymo.com/rides/san-francisco/', type: 'operator' }
  ],
  'Zoox Vegas': [
    { label: 'Service information from Zoox', url: 'https://zoox.com/las-vegas/', type: 'operator' }
  ]
};