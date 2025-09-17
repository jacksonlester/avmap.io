import { z } from 'zod';

// Auth schemas
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  csrf_token: z.string().min(1, 'CSRF token is required')
});

// Deployment schemas
export const DeploymentSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required'),
  company: z.enum(['Waymo', 'Tesla', 'Zoox', 'Uber', 'Lyft', 'May Mobility', 'Cruise', 'Aurora', 'Motional']),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1, 'Country is required'),
  status: z.enum(['active', 'planned', 'suspended', 'terminated']),
  launchDate: z.string().optional(),
  description: z.string().optional(),
  serviceType: z.enum(['robotaxi', 'shuttle', 'delivery', 'testing']),
  operatingHours: z.string().optional(),
  website: z.string().url().optional()
});

// Event schemas
export const EventSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  deploymentId: z.string().min(1, 'Deployment ID is required'),
  type: z.enum(['launch', 'expansion', 'suspension', 'termination', 'boundary_update', 'milestone']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  shapeId: z.string().optional(), // For boundary_update events
  source: z.string().optional(),
  url: z.string().url().optional()
});

// Service Area Shape schemas
export const ServiceAreaShapeSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  deploymentId: z.string().min(1, 'Deployment ID is required'),
  name: z.string().min(1, 'Name is required'),
  version: z.string().min(1, 'Version is required'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
  geojson: z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(z.any())
  }),
  notes: z.string().optional()
});

// News schemas
export const NewsSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  slug: z.string().min(1, 'Slug is required'),
  title: z.string().min(1, 'Title is required'),
  source: z.string().min(1, 'Source is required'),
  url: z.string().url('Valid URL is required'),
  publishedAt: z.string().min(1, 'Published date is required'),
  type: z.enum(['Announcement', 'Launch', 'Partnership', 'Funding', 'Analysis', 'Regulatory', 'Safety', 'Other']),
  companies: z.array(z.string()),
  tags: z.array(z.string()),
  excerpt: z.string().min(1, 'Excerpt is required'),
  heroImage: z.string().optional()
});

// Page schemas
export const PageSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string().min(1, 'Content is required'),
  lastModified: z.string().optional(),
  published: z.boolean().default(true)
});

// Version restoration schema
export const RestoreVersionSchema = z.object({
  entity: z.string().min(1),
  entityId: z.string().min(1),
  timestamp: z.string().min(1),
  csrf_token: z.string().min(1)
});

// Search and filter schemas
export const EventFiltersSchema = z.object({
  deploymentId: z.string().optional(),
  type: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
});

export const NewsFiltersSchema = z.object({
  type: z.string().optional(),
  companies: z.array(z.string()).optional(),
  search: z.string().optional()
});

export const AsOfDateSchema = z.object({
  deploymentId: z.string().min(1),
  date: z.string().min(1)
});

// Form action response types
export type FormActionResult = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: unknown;
};

export type LoginResult = FormActionResult & {
  redirectTo?: string;
};

export type EntitySaveResult = FormActionResult & {
  entity?: unknown;
  version?: string;
};