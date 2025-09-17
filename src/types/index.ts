export interface ServiceArea {
  id: string;
  name: string;
  company: string;
  status: 'Commercial' | 'Testing' | 'Pilot';
  geojsonPath: string;
  lastUpdated: string;
}

export interface HistoricalServiceArea {
  id: string;
  deploymentId: string;
  name: string;
  version: string;
  effectiveDate: string;
  endDate?: string;
  company: string;
  status: 'Commercial' | 'Testing' | 'Pilot';
  geojsonPath: string;
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
  statuses: string[];
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