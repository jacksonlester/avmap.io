import { readFileSync, writeFileSync, renameSync } from 'fs';
import { join } from 'path';

// Read the historical service areas data
const historicalDataPath = './public/data/historical_service_areas.json';
const historicalData = JSON.parse(readFileSync(historicalDataPath, 'utf-8'));

// Mapping of current file names to their exact start dates
const fileRenameMappings = {
  // Waymo San Francisco
  'Waymo San Francisco June 2025 Boundary.geoJSON': {
    effectiveDate: '2025-06-17',
    newName: 'Waymo San Francisco June 17 2025 Boundary.geoJSON'
  },
  'Waymo San Francisco August 2024 Boundary.geoJSON': {
    effectiveDate: '2024-08-06',
    newName: 'Waymo San Francisco August 6 2024 Boundary.geoJSON'
  },
  'Waymo San Francisco August 2023 Boundary.geoJSON': {
    effectiveDate: '2023-08-21',
    newName: 'Waymo San Francisco August 21 2023 Boundary.geoJSON'
  },
  'Waymo San Francisco December 2022 Boundary.geoJSON': {
    effectiveDate: '2022-12-16',
    newName: 'Waymo San Francisco December 16 2022 Boundary.geoJSON'
  },

  // Waymo Phoenix
  'Waymo Phoenix June 2024 Boundary.geoJSON': {
    effectiveDate: '2024-06-05',
    newName: 'Waymo Phoenix June 5 2024 Boundary.geoJSON'
  },
  'Waymo Phoenix May 2023 Boundary.geoJSON': {
    effectiveDate: '2023-05-04',
    newName: 'Waymo Phoenix May 4 2023 Boundary.geoJSON'
  },
  'Waymo Phoenix December 2022 Boundary.geojson': {
    effectiveDate: '2022-11-01',
    newName: 'Waymo Phoenix November 1 2022 Boundary.geojson'
  },
  'Waymo Phoenix October 2020.geoJSON': {
    effectiveDate: '2020-10-08',
    newName: 'Waymo Phoenix October 8 2020 Boundary.geoJSON'
  },

  // Waymo Los Angeles
  'Waymo Los Angeles June 2025 Boundary.geoJSON': {
    effectiveDate: '2025-06-17',
    newName: 'Waymo Los Angeles June 17 2025 Boundary.geoJSON'
  },
  'Waymo Los Angeles August 2024 Boundary.geoJSON': {
    effectiveDate: '2024-08-05',
    newName: 'Waymo Los Angeles August 5 2024 Boundary.geoJSON'
  },
  'Waymo Los Angeles March 2024 Boundary.geoJSON': {
    effectiveDate: '2024-04-10',
    newName: 'Waymo Los Angeles April 10 2024 Boundary.geoJSON'
  },

  // Waymo Austin
  'Waymo Austin July 2025 Boundary.geoJSON': {
    effectiveDate: '2025-07-24',
    newName: 'Waymo Austin July 24 2025 Boundary.geoJSON'
  },
  'Waymo Austin March 2025 Boundary.geoJSON': {
    effectiveDate: '2025-03-15',
    newName: 'Waymo Austin March 15 2025 Boundary.geoJSON'
  },

  // Waymo Atlanta
  'Waymo Atlanta June 2025 Boundary.geoJSON': {
    effectiveDate: '2025-06-20',
    newName: 'Waymo Atlanta June 20 2025 Boundary.geoJSON'
  },

  // Waymo Silicon Valley
  'Waymo Silicon Valley June 2025 Boundary.geoJSON': {
    effectiveDate: '2025-06-17',
    newName: 'Waymo Silicon Valley June 17 2025 Boundary.geoJSON'
  },
  'Waymo Silicon Valley March 2025 Boundary.geoJSON': {
    effectiveDate: '2025-03-15',
    newName: 'Waymo Silicon Valley March 15 2025 Boundary.geoJSON'
  },

  // Tesla
  'Tesla Bay Area July 31 2025 Boundary.geoJSON': {
    effectiveDate: '2025-07-31',
    newName: 'Tesla Bay Area July 31 2025 Boundary.geoJSON' // Already correct
  },
  'Tesla Austin August 26 2025 Boundary.geoJSON': {
    effectiveDate: '2025-08-26',
    newName: 'Tesla Austin August 26 2025 Boundary.geoJSON' // Already correct
  },
  'Tesla Austin August 3 2025 Boundary.geoJSON': {
    effectiveDate: '2025-08-03',
    newName: 'Tesla Austin August 3 2025 Boundary.geoJSON' // Already correct
  },
  'Tesla Austin July 14 2025 Boundary.geoJSON': {
    effectiveDate: '2025-07-14',
    newName: 'Tesla Austin July 14 2025 Boundary.geoJSON' // Already correct
  },
  'Tesla Austin June 22 2025 Boundary.geoJSON': {
    effectiveDate: '2025-06-22',
    newName: 'Tesla Austin June 22 2025 Boundary.geoJSON' // Already correct
  },

  // Zoox
  'Zoox Las Vegas September 2025 Boundary.geoJSON': {
    effectiveDate: '2025-09-01',
    newName: 'Zoox Las Vegas September 1 2025 Boundary.geoJSON'
  },

  // May Mobility
  'May Mobility Atlanta September 2025 Boundary.geoJSON': {
    effectiveDate: '2025-09-01',
    newName: 'May Mobility Atlanta September 1 2025 Boundary.geoJSON'
  }
};

const areasDir = './public/areas';

console.log('Starting file renaming process...\n');

// Step 1: Rename physical files
Object.entries(fileRenameMappings).forEach(([currentName, mapping]) => {
  const currentPath = join(areasDir, currentName);
  const newPath = join(areasDir, mapping.newName);

  try {
    renameSync(currentPath, newPath);
    console.log(`✅ Renamed: ${currentName} → ${mapping.newName}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`⚠️  File not found: ${currentName}`);
    } else {
      console.error(`❌ Error renaming ${currentName}:`, error.message);
    }
  }
});

// Step 2: Update historical service areas JSON
console.log('\n📝 Updating historical service areas references...');

const updatedHistoricalData = { ...historicalData };

Object.entries(updatedHistoricalData).forEach(([key, serviceArea]) => {
  const currentPath = serviceArea.geojsonPath;
  if (currentPath && currentPath.startsWith('/areas/')) {
    const fileName = currentPath.replace('/areas/', '');

    if (fileRenameMappings[fileName]) {
      const newFileName = fileRenameMappings[fileName].newName;
      updatedHistoricalData[key] = {
        ...serviceArea,
        geojsonPath: `/areas/${newFileName}`
      };
      console.log(`✅ Updated path: ${fileName} → ${newFileName}`);
    }
  }
});

// Write updated historical data
writeFileSync(historicalDataPath, JSON.stringify(updatedHistoricalData, null, 2));
console.log('\n✅ Updated historical_service_areas.json');

console.log('\n🎉 File renaming complete!');