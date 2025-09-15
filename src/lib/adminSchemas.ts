import { z } from 'zod';
import { 
  OPERATORS, 
  RIDER_APPS, 
  STORY_TYPES, 
  SERVICE_ACCESS_OPTIONS, 
  AUTONOMY_MODE_OPTIONS, 
  EVENT_TYPES 
} from '@/types/admin';

// Updated schemas with new admin types

export const DeploymentSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  operator: z.enum(OPERATORS as [string, ...string[]], {
    errorMap: () => ({ message: 'Please select a valid operator' })
  }),
  city: z.string().min(1, 'City is required'),
  startedOn: z.string().optional(),
  endedOn: z.string().optional().nullable(),
  mergedInto: z.string().optional().nullable(),
  accessCurrent: z.enum(SERVICE_ACCESS_OPTIONS as [string, ...string[]]).optional(),
  autonomyCurrent: z.enum(AUTONOMY_MODE_OPTIONS as [string, ...string[]]).optional(),
  riderAppsCurrent: z.array(z.enum(RIDER_APPS as [string, ...string[]])).optional(),
  vehicleTypeCurrent: z.array(z.string()).optional()
});

export const EventSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  deploymentId: z.string().min(1, 'Deployment ID is required'),
  date: z.string().min(1, 'Date is required'),
  type: z.enum(EVENT_TYPES as [string, ...string[]], {
    errorMap: () => ({ message: 'Please select a valid event type' })
  }),
  details: z.any().optional(),
  shapeId: z.string().optional(),
  effectiveFrom: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal(''))
});

export const ServiceAreaShapeSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  deploymentId: z.string().min(1, 'Deployment ID is required'),
  validFrom: z.string().min(1, 'Valid from date is required'),
  validTo: z.string().optional().nullable(),
  status: z.enum(['active', 'planned']).optional(),
  geojson: z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(z.any())
  }),
  bbox: z.array(z.number()).length(4).optional(),
  areaKm2: z.number().optional(),
  shapeParts: z.array(z.string()).optional(),
  lineageEventId: z.string().optional()
});

export const AdminNewsSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  slug: z.string().min(1, 'Slug is required'),
  title: z.string().min(1, 'Title is required'),
  source: z.string().min(1, 'Source is required'),
  url: z.string().url('Valid URL is required'),
  publishedAt: z.string().min(1, 'Published date is required'),
  type: z.enum(STORY_TYPES as [string, ...string[]], {
    errorMap: () => ({ message: 'Please select a valid story type' })
  }),
  operators: z.array(z.enum(OPERATORS as [string, ...string[]])),
  apps: z.array(z.enum(RIDER_APPS as [string, ...string[]])),
  tags: z.array(z.string()),
  excerpt: z.string().min(1, 'Excerpt is required'),
  heroImage: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).default('published')
});

export const PageSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  slug: z.string().min(1, 'Slug is required'),
  title: z.string().min(1, 'Title is required'),
  contentMd: z.string().min(1, 'Content is required'),
  status: z.enum(['draft', 'published']).default('published')
});

// Event details schemas for different event types
export const ServiceAccessUpdateDetailsSchema = z.object({
  access: z.enum(SERVICE_ACCESS_OPTIONS as [string, ...string[]])
});

export const AutonomyUpdateDetailsSchema = z.object({
  autonomy: z.enum(AUTONOMY_MODE_OPTIONS as [string, ...string[]])
});

export const RiderAppUpdateDetailsSchema = z.object({
  add: z.array(z.enum(RIDER_APPS as [string, ...string[]])).optional(),
  remove: z.array(z.enum(RIDER_APPS as [string, ...string[]])).optional()
});

export const BoundaryUpdateDetailsSchema = z.object({
  shapeId: z.string().min(1, 'Shape ID is required')
});

// Form validation schemas
export const AdminMapFiltersSchema = z.object({
  operators: z.array(z.string()).optional(),
  apps: z.array(z.string()).optional(),
  asOfDate: z.string().optional()
});

export const AdminNewsFiltersSchema = z.object({
  types: z.array(z.string()).optional(),
  operators: z.array(z.string()).optional(),
  apps: z.array(z.string()).optional(),
  search: z.string().optional()
});

export const AsOfDateSchema = z.object({
  deploymentId: z.string().min(1),
  date: z.string().min(1)
});

// Form action result types
export type FormActionResult = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: any;
};

export type EntitySaveResult = FormActionResult & {
  entity?: any;
  version?: string;
};