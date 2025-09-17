# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server
npm run dev          # Runs on localhost:8080 (configured in vite.config.ts)

# Build commands
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build

# Code quality
npm run lint         # ESLint checking
```

## Project Architecture

This is an interactive map application for exploring autonomous vehicle (AV) service areas across the United States, built with React, TypeScript, Vite, and Mapbox GL.

### Core Architecture

**Frontend Stack:**
- **React 18** with TypeScript and React Router for navigation
- **Vite** for build tooling and dev server
- **Tailwind CSS** + **shadcn/ui** for styling and components
- **Mapbox GL** for interactive mapping
- **TanStack Query** for data fetching and caching
- **next-themes** for theme management

**Data Architecture:**
- Service area definitions in `data/service_area_shapes.json`
- GeoJSON boundary files referenced from service area data
- News articles and taxonomy data for content management
- Local storage-based admin system with versioning and audit logging

### Key Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui component library
│   ├── filters/        # Map filtering components
│   └── Map.tsx         # Core map component
├── pages/              # Route components (Index, Companies, Cities, News, About, admin/*)
├── lib/                # Utility libraries
│   ├── dataStore.ts    # Local storage management with versioning
│   ├── auth.ts         # Basic authentication utilities
│   └── schemas.ts      # Zod validation schemas
├── types/              # TypeScript type definitions
└── hooks/              # Custom React hooks

data/                   # JSON data files
public/                 # Static assets and additional data files
```

### Map Implementation

The core map functionality is in `src/components/Map.tsx`:
- Uses Mapbox GL with service area overlays
- Dynamic loading of GeoJSON boundary data
- Company-specific color coding (defined in `src/types/index.ts`)
- Filter integration for companies and service statuses

### Data Management

**Service Areas:** Configured in `data/service_area_shapes.json` with references to GeoJSON files
**Admin System:** Browser-based with localStorage persistence, includes:
- Versioning system for data changes
- Audit logging for all modifications
- CSV import functionality for bulk operations
- CSRF protection and rate limiting

### Environment Configuration

Required environment variable:
```bash
VITE_MAPBOX_PUBLIC_TOKEN=your_mapbox_public_token_here
```

### Styling System

- **Tailwind CSS** with custom configuration in `tailwind.config.ts`
- **CSS custom properties** for dynamic values (e.g., `--header-h` for header height)
- **Component variants** using class-variance-authority
- **shadcn/ui** component system with customization in `components.json`

### Navigation and Layout

- React Router with routes defined in `src/App.tsx`
- Header component with responsive design
- Full-viewport map layout with `absolute inset-0` positioning
- No-scroll behavior on home page (`/`) only to prevent background scrolling

### Key Features

1. **Interactive Map**: Mapbox GL implementation with service area overlays
2. **Filtering System**: Multi-select filters for companies and service statuses
3. **Admin Interface**: Content management accessible at `/admin/news?admin=1`
4. **News Management**: Article database with CSV import capabilities
5. **Responsive Design**: Mobile-first approach with Tailwind breakpoints

### Development Notes

- Uses strict TypeScript with relaxed settings for rapid development
- Path aliases configured with `@/*` pointing to `src/*`
- Server runs on port 8080 with IPv6 support (`::`)
- Vite dev server with React SWC for fast builds