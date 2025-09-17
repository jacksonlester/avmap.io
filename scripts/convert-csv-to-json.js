import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to parse CSV manually (simple CSV parser)
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && (i === 0 || line[i-1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

// Function to convert date format
function convertDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;

  // Handle "July 31, 2025" format
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date: ${dateStr}`);
    return null;
  }
  return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

// Function to generate unique ID
function generateId(row, index) {
  const company = row['Tech Firm'].toLowerCase().replace(/\s+/g, '-');
  const city = row['City'].toLowerCase().replace(/\s+/g, '-');
  const startDate = convertDate(row['Start Date']);

  if (startDate) {
    const [year, month] = startDate.split('-');
    return `${company}-${city}-${year}-${month}`;
  }

  return `${company}-${city}-${index}`;
}

// Function to convert geojson path
function convertGeojsonPath(originalPath) {
  if (!originalPath) return '';

  // Extract filename from the Notion-style path
  const parts = originalPath.split('/');
  const filename = parts[parts.length - 1];

  // Decode URL-encoded filename
  const decodedFilename = decodeURIComponent(filename);

  // Convert underscores to spaces and .geojson to .geoJSON
  const correctedFilename = decodedFilename
    .replace(/_/g, ' ')  // Replace underscores with spaces
    .replace('.geojson', '.geoJSON');  // Fix case

  // Convert to our expected path format
  return `/areas/${correctedFilename}`;
}

// Function to convert supervision value
function convertSupervision(supervision) {
  if (supervision === 'Autonomous') return 'Fully Autonomous';
  if (supervision === 'Safety Driver') return 'Safety Driver';
  return 'Fully Autonomous'; // default
}

// Function to convert platform
function convertPlatform(bookingApp, company) {
  if (bookingApp === 'Waymo') return 'Waymo';
  if (bookingApp === 'Uber') return 'Uber';
  if (bookingApp === 'Lyft') return 'Lyft';
  if (bookingApp === 'Robotaxi') return 'Robotaxi';
  if (company === 'Zoox') return 'Zoox';
  return bookingApp || 'Unknown';
}

// Main conversion function
function convertCSVToJSON() {
  try {
    // Read the CSV file
    const csvPath = path.join(__dirname, '../data/deployments.csv');
    const csvData = fs.readFileSync(csvPath, 'utf8');

    // Parse CSV
    const rows = parseCSV(csvData);
    console.log(`Parsed ${rows.length} rows from CSV`);

    // Convert to historical service areas format
    const historicalData = {};

    rows.forEach((row, index) => {
      const id = generateId(row, index);
      const startDate = convertDate(row['Start Date']);
      const endDate = convertDate(row['End Date']);

      if (!startDate) {
        console.warn(`Skipping row ${index} due to invalid start date: ${row['Start Date']}`);
        return;
      }

      // Create deployment ID from company and city
      const company = row['Tech Firm'];
      const city = row['City'].toLowerCase().replace(/\s+/g, '-');
      const deploymentId = `${company.toLowerCase()}-${city}`;

      historicalData[id] = {
        id: id,
        deploymentId: deploymentId,
        name: row['City'],
        version: "1.0",
        effectiveDate: startDate,
        endDate: endDate,
        company: company,
        platform: convertPlatform(row['Booking App'], company),
        supervision: convertSupervision(row['Supervision']),
        access: row['Access'] || 'Public',
        fares: row['Fares?'] || 'Yes',
        directBooking: row['Direct Booking?'] || 'Yes',
        status: row['Status 1'] === 'Active' ? 'Active' : 'Testing',
        geojsonPath: convertGeojsonPath(row['Service Area']),
        notes: `${company} ${row['City']} service`
      };
    });

    // Write to JSON file
    const outputPath = path.join(__dirname, '../public/data/historical_service_areas.json');
    fs.writeFileSync(outputPath, JSON.stringify(historicalData, null, 2));

    console.log(`✅ Successfully converted CSV to JSON`);
    console.log(`📄 Output written to: ${outputPath}`);
    console.log(`📊 Converted ${Object.keys(historicalData).length} service areas`);

    // Print summary
    const companies = [...new Set(Object.values(historicalData).map(area => area.company))];
    const cities = [...new Set(Object.values(historicalData).map(area => area.name))];
    console.log(`🏢 Companies: ${companies.join(', ')}`);
    console.log(`🏙️ Cities: ${cities.join(', ')}`);

  } catch (error) {
    console.error('❌ Error converting CSV to JSON:', error);
    process.exit(1);
  }
}

// Run the conversion
convertCSVToJSON();