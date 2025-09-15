import { Deployment, Event, ServiceAreaShape, DeploymentState, ServiceAccess, AutonomyMode, RiderApp } from '@/types/admin';

/**
 * Computes the derived state for a deployment as of a specific date
 */
export function stateForDeploymentAsOf(
  deployment: Deployment,
  events: Event[],
  shapes: ServiceAreaShape[],
  asOf: string // ISO date string
): DeploymentState {
  const asOfTime = new Date(asOf).getTime();
  
  // Filter events for this deployment that occurred on or before the asOf date
  const relevantEvents = events
    .filter(event => 
      event.deploymentId === deployment.id && 
      new Date(event.effectiveFrom || event.date).getTime() <= asOfTime
    )
    .sort((a, b) => 
      new Date(a.effectiveFrom || a.date).getTime() - new Date(b.effectiveFrom || b.date).getTime()
    );

  // Initialize state
  let access: ServiceAccess | undefined;
  let autonomy: AutonomyMode | undefined;
  let riderApps: RiderApp[] = [];

  // Walk through events chronologically, last wins for access/autonomy
  for (const event of relevantEvents) {
    switch (event.type) {
      case 'service_access_update':
        access = event.details?.access;
        break;
      
      case 'autonomy_update':
        autonomy = event.details?.autonomy;
        break;
      
      case 'rider_app_update':
        // Apply adds and removes
        if (event.details?.add) {
          riderApps = [...new Set([...riderApps, ...event.details.add])];
        }
        if (event.details?.remove) {
          riderApps = riderApps.filter(app => !event.details.remove.includes(app));
        }
        break;
      
      case 'testing_start':
        if (!access) access = 'closed_testing';
        break;
    }
  }

  // Find active and planned shapes
  const deploymentShapes = shapes.filter(shape => shape.deploymentId === deployment.id);
  
  let activeShape: ServiceAreaShape | undefined;
  let plannedShape: ServiceAreaShape | undefined;

  for (const shape of deploymentShapes) {
    const validFromTime = new Date(shape.validFrom).getTime();
    const validToTime = shape.validTo ? new Date(shape.validTo).getTime() : Infinity;
    
    if (validFromTime <= asOfTime && asOfTime < validToTime) {
      activeShape = shape;
    } else if (validFromTime > asOfTime && !plannedShape) {
      plannedShape = shape;
    }
  }

  return {
    access,
    autonomy,
    riderApps,
    activeShape,
    plannedShape
  };
}

/**
 * Computes states for all deployments as of a specific date
 */
export function stateForAllDeploymentsAsOf(
  deployments: Deployment[],
  events: Event[],
  shapes: ServiceAreaShape[],
  asOf: string
) {
  return deployments.map(deployment => ({
    deploymentId: deployment.id,
    operator: deployment.operator,
    ...stateForDeploymentAsOf(deployment, events, shapes, asOf)
  }));
}

/**
 * Filters deployments based on operator and app selections with OR within groups, AND across groups
 */
export function filterDeploymentsByOperatorAndApps(
  states: ReturnType<typeof stateForAllDeploymentsAsOf>,
  operatorFilter: string[],
  appFilter: string[]
): string[] {
  return states
    .filter(state => {
      // If no operator filter, include all operators
      const operatorMatch = operatorFilter.length === 0 || operatorFilter.includes(state.operator);
      
      // If no app filter, include all apps
      const appMatch = appFilter.length === 0 || 
        (state.riderApps && state.riderApps.some(app => appFilter.includes(app)));
      
      // AND logic across groups
      return operatorMatch && appMatch;
    })
    .map(state => state.deploymentId);
}

/**
 * Computes bbox for a GeoJSON feature
 */
export function computeBbox(geojson: any): [number, number, number, number] | undefined {
  if (!geojson?.features?.[0]?.geometry) return undefined;
  
  const geometry = geojson.features[0].geometry;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  
  function processCoords(coords: any) {
    if (Array.isArray(coords[0])) {
      coords.forEach(processCoords);
    } else {
      const [lng, lat] = coords;
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
  }
  
  processCoords(geometry.coordinates);
  
  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Computes approximate area in km² for a GeoJSON polygon
 */
export function computeAreaKm2(geojson: any): number | undefined {
  try {
    if (!geojson?.features?.[0]?.geometry?.coordinates) return undefined;
    
    const coords = geojson.features[0].geometry.coordinates[0];
    if (!Array.isArray(coords) || coords.length < 3) return undefined;
    
    // Simple polygon area calculation using shoelace formula
    // Note: This is an approximation that doesn't account for Earth's curvature
    let area = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const [x1, y1] = coords[i];
      const [x2, y2] = coords[i + 1];
      area += (x1 * y2) - (x2 * y1);
    }
    area = Math.abs(area) / 2;
    
    // Convert from degrees² to km² (very rough approximation)
    // 1 degree ≈ 111 km at equator
    return area * 111 * 111;
  } catch {
    return undefined;
  }
}