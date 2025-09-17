import { HistoricalServiceArea, HistoricalServiceAreaData } from '@/types';

// Extract company from deployment ID or name
export function extractCompanyFromData(serviceArea: HistoricalServiceArea): string {
  // First try to extract from deploymentId
  if (serviceArea.deploymentId) {
    const deploymentId = serviceArea.deploymentId.toLowerCase();
    if (deploymentId.includes('waymo')) return 'Waymo';
    if (deploymentId.includes('tesla')) return 'Tesla';
    if (deploymentId.includes('zoox')) return 'Zoox';
    if (deploymentId.includes('may-mobility') || deploymentId.includes('may_mobility')) return 'May Mobility';
  }

  // Then try to extract from the ID itself
  const id = serviceArea.id.toLowerCase();
  if (id.includes('waymo')) return 'Waymo';
  if (id.includes('tesla')) return 'Tesla';
  if (id.includes('zoox')) return 'Zoox';
  if (id.includes('may-mobility') || id.includes('may_mobility')) return 'May Mobility';

  // Finally try to extract from name
  const name = serviceArea.name.toLowerCase();
  if (name.includes('waymo')) return 'Waymo';
  if (name.includes('tesla')) return 'Tesla';
  if (name.includes('zoox')) return 'Zoox';
  if (name.includes('may mobility')) return 'May Mobility';

  return 'Unknown';
}

// Process historical data and add missing company info and attributes
export function processHistoricalData(data: HistoricalServiceAreaData): HistoricalServiceAreaData {
  const processed: HistoricalServiceAreaData = {};

  Object.entries(data).forEach(([key, serviceArea]) => {
    const company = serviceArea.company || extractCompanyFromData(serviceArea);

    // Add attributes based on company and deployment context
    let platform = 'Unknown';
    let supervision = 'Fully Autonomous';
    let access = 'Public';
    let fares = 'Yes';
    let directBooking = 'Yes';

    // Set attributes based on company and historical context
    if (company === 'Waymo') {
      platform = serviceArea.name === 'Austin' ? 'Uber' : 'Waymo';
      supervision = 'Fully Autonomous';
      access = 'Public';
      fares = 'Yes';
      directBooking = serviceArea.name === 'Austin' ? 'No' : 'Yes';
    } else if (company === 'Tesla') {
      platform = 'Robotaxi';
      supervision = 'Safety Driver';
      access = serviceArea.name === 'Bay Area' ? 'Waitlist' : 'Public';
      fares = 'Yes';
      directBooking = 'Yes';
    } else if (company === 'Zoox') {
      platform = 'Zoox';
      supervision = 'Fully Autonomous';
      access = 'Public';
      fares = 'No';
      directBooking = 'Yes';
    } else if (company === 'May Mobility') {
      platform = 'Lyft';
      supervision = 'Safety Driver';
      access = 'Public';
      fares = 'Yes';
      directBooking = 'No';
    }

    processed[key] = {
      ...serviceArea,
      company,
      platform: platform as any,
      supervision: supervision as any,
      access: access as any,
      fares: fares as any,
      directBooking: directBooking as any,
      status: serviceArea.status || 'Testing',
    };
  });

  return processed;
}

// Get service areas that were active on a specific date
export function getServiceAreasForDate(
  data: HistoricalServiceAreaData,
  targetDate: Date
): HistoricalServiceArea[] {
  const activeAreas: HistoricalServiceArea[] = [];

  Object.values(data).forEach((serviceArea) => {
    const effectiveDate = new Date(serviceArea.effectiveDate);
    const endDate = serviceArea.endDate ? new Date(serviceArea.endDate) : null;

    // Service area is active if:
    // 1. Target date is on or after the effective date AND
    // 2. Target date is before the end date (if end date exists) OR no end date exists
    const isActive = targetDate >= effectiveDate && (!endDate || targetDate <= endDate);

    if (isActive) {
      activeAreas.push(serviceArea);
    }
  });

  // If multiple versions of the same deployment exist for the same date,
  // return only the latest version that was active on that date
  const latestVersions = new Map<string, HistoricalServiceArea>();

  activeAreas.forEach((area) => {
    const key = area.deploymentId || area.id;
    const existing = latestVersions.get(key);

    if (!existing || new Date(area.effectiveDate) > new Date(existing.effectiveDate)) {
      latestVersions.set(key, area);
    }
  });

  return Array.from(latestVersions.values());
}

// Get all deployment IDs and their current active version for smooth transitions
export function getDeploymentTransitions(
  data: HistoricalServiceAreaData,
  targetDate: Date
): Map<string, HistoricalServiceArea | null> {
  const deploymentMap = new Map<string, HistoricalServiceArea | null>();

  // Group by deployment ID
  const deploymentGroups = new Map<string, HistoricalServiceArea[]>();
  Object.values(data).forEach((area) => {
    const deploymentId = area.deploymentId || area.id;
    if (!deploymentGroups.has(deploymentId)) {
      deploymentGroups.set(deploymentId, []);
    }
    deploymentGroups.get(deploymentId)!.push(area);
  });

  // For each deployment, find the active version (or null if none)
  deploymentGroups.forEach((areas, deploymentId) => {
    const activeArea = areas
      .filter((area) => {
        const effectiveDate = new Date(area.effectiveDate);
        const endDate = area.endDate ? new Date(area.endDate) : null;
        return targetDate >= effectiveDate && (!endDate || targetDate <= endDate);
      })
      .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0];

    deploymentMap.set(deploymentId, activeArea || null);
  });

  return deploymentMap;
}

// Get the date range for all historical data
export function getDateRange(data: HistoricalServiceAreaData): { start: Date; end: Date } {
  const dates = Object.values(data).map(area => new Date(area.effectiveDate));

  // Add end dates if they exist
  Object.values(data).forEach(area => {
    if (area.endDate) {
      dates.push(new Date(area.endDate));
    }
  });

  // If no dates found, use a default range
  if (dates.length === 0) {
    return {
      start: new Date('2020-01-01'),
      end: new Date(),
    };
  }

  const start = new Date(Math.min(...dates.map(d => d.getTime())));
  const end = new Date(Math.max(...dates.map(d => d.getTime())));

  // Ensure end date is not in the future beyond today
  const today = new Date();
  if (end > today) {
    return { start, end: today };
  }

  return { start, end };
}

// Get all unique companies from historical data
export function getUniqueCompanies(data: HistoricalServiceAreaData): string[] {
  const companies = new Set<string>();

  Object.values(data).forEach(area => {
    const company = area.company || extractCompanyFromData(area);
    companies.add(company);
  });

  return Array.from(companies).filter(company => company !== 'Unknown');
}