// AV autonomy providers
export type Operator =
  | "Waymo" | "Zoox" | "Tesla" | "May Mobility" | "Cruise" | "Motional" | "Momenta" | "Other";

// Rider app / distribution channels (TNCs and first-party apps)
export type RiderApp =
  | "Waymo App" | "Uber" | "Lyft" | "Zoox App" | "Tesla App" | "Other";

export type StoryType =
  | "Announcement" | "Launch" | "Partnership" | "Funding" | "Analysis" | "Regulatory" | "Safety" | "Other";

export type ServiceAccess = "closed_testing" | "open_testing" | "public_service";
export type AutonomyMode = "safety_driver" | "safety_attendant" | "permitted" | "fully_autonomous";

export type Deployment = {
  id: string;             // stable slug: "waymo-sf"
  operator: Operator | string; // autonomy provider
  city: string;
  startedOn?: string;
  endedOn?: string | null;
  mergedInto?: string | null;
  // current snapshot (derived but cached for UI convenience)
  accessCurrent?: ServiceAccess;
  autonomyCurrent?: AutonomyMode;
  riderAppsCurrent?: RiderApp[];     // availability channels "as of now"
  vehicleTypeCurrent?: string[];     // optional
};

export type EventType =
  | "testing_start"
  | "service_access_update"   // -> ServiceAccess
  | "autonomy_update"         // -> AutonomyMode
  | "rider_app_update"        // -> RiderApp[] add/remove
  | "boundary_update"         // -> shapeId
  | "permit_granted"
  | "fare_enabled"
  | "hours_update"
  | "merge"
  | "pause" | "resume";

export type Event = {
  id: string;
  deploymentId: string;
  date: string;             // ISO
  type: EventType;
  details?: any;            // e.g., {add:["Uber"], remove:["Waymo App"]}
  shapeId?: string;         // for boundary_update
  effectiveFrom?: string;   // defaults to date
  sourceUrl?: string;
};

export type ServiceAreaShape = {
  id: string;
  deploymentId: string;
  validFrom: string;
  validTo?: string | null;   // null = current
  status?: "active" | "planned";
  geojson: any;              // GeoJSON Feature (or url if you prefer)
  bbox?: [number,number,number,number];
  areaKm2?: number;
  shapeParts?: string[];
  lineageEventId?: string;
};

export type NewsItem = {
  id: string;
  slug: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;       // ISO
  type: StoryType;
  operators: (Operator | string)[]; // multi-select of operators
  apps: (RiderApp | string)[];      // multi-select of rider apps
  tags: string[];
  excerpt: string;
  heroImage?: string;
  status?: "draft" | "scheduled" | "published" | "archived";
};

export type Page = {
  id: string; 
  slug: string; 
  title: string;
  contentMd: string; 
  status?: "draft" | "published";
};

// Derived state for a deployment at a specific date
export type DeploymentState = {
  access?: ServiceAccess;
  autonomy?: AutonomyMode;
  riderApps?: RiderApp[];           // availability channels as-of date
  activeShape?: ServiceAreaShape | undefined;
  plannedShape?: ServiceAreaShape | undefined;
};

// Filters for map and news
export type AdminMapFilters = {
  operators: (Operator | string)[];
  apps: (RiderApp | string)[];
  asOfDate?: string; // ISO date
};

export type AdminNewsFilters = {
  types: StoryType[];
  operators: (Operator | string)[];
  apps: (RiderApp | string)[];
  search: string;
};

// API response types
export type StateApiResponse = {
  deploymentId: string;
  operator: Operator | string;
  riderApps?: RiderApp[];
  access?: ServiceAccess;
  autonomy?: AutonomyMode;
  activeShape?: ServiceAreaShape;
  plannedShape?: ServiceAreaShape;
}[];

// Constants
export const OPERATORS: (Operator | string)[] = [
  "Waymo", "Zoox", "Tesla", "May Mobility", "Cruise", "Motional", "Momenta", "Other"
];

export const RIDER_APPS: (RiderApp | string)[] = [
  "Waymo App", "Uber", "Lyft", "Zoox App", "Tesla App", "Other"
];

export const STORY_TYPES: StoryType[] = [
  "Announcement", "Launch", "Partnership", "Funding", "Analysis", "Regulatory", "Safety", "Other"
];

export const SERVICE_ACCESS_OPTIONS: ServiceAccess[] = [
  "closed_testing", "open_testing", "public_service"
];

export const AUTONOMY_MODE_OPTIONS: AutonomyMode[] = [
  "safety_driver", "safety_attendant", "permitted", "fully_autonomous"
];

export const EVENT_TYPES: EventType[] = [
  "testing_start", "service_access_update", "autonomy_update", "rider_app_update",
  "boundary_update", "permit_granted", "fare_enabled", "hours_update", "merge", "pause", "resume"
];

// Color mapping for operators (extending existing company colors)
export const OPERATOR_COLORS: Record<string, string> = {
  'Waymo': '#4285F4',
  'Tesla': '#E31937',
  'Zoox': '#00D9FF',
  'May Mobility': '#00B04F',
  'Cruise': '#FF6B35',
  'Motional': '#7B2CBF',
  'Momenta': '#F72585',
  'Other': '#6C757D'
};