import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Get credentials from environment or set directly
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vbqijqcveavjycsfoszy.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicWlqcWN2ZWF2anljc2Zvc3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMzE2MTUsImV4cCI6MjA3MzcwNzYxNX0.LVmS59sfu5jkuUVhecxzNhXmowlNVqIpsE0-UtTgtNY';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Step 1: Upload all geometry files to Supabase Storage
async function uploadGeometries() {
  console.log('📁 Uploading geometry files to Supabase Storage...\n');

  const areasDir = './public/areas';
  const files = readdirSync(areasDir).filter(f => f.endsWith('.geoJSON') || f.endsWith('.geojson'));

  for (const file of files) {
    try {
      const filePath = join(areasDir, file);
      const geojson = JSON.parse(readFileSync(filePath, 'utf-8'));

      // Clean up filename for storage
      const storageFileName = file.toLowerCase().replace(/\s+/g, '-');
      const geometryName = storageFileName.replace('.geojson', '').replace('.geojson', '');
      const displayName = file.replace(/\.(geoJSON|geojson)$/, '');

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('service-area-boundaries')
        .upload(storageFileName, JSON.stringify(geojson, null, 2), {
          contentType: 'application/json',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('service-area-boundaries')
        .getPublicUrl(storageFileName);

      // Store metadata
      const { error: dbError } = await supabase
        .from('service_area_geometries')
        .insert([{
          geometry_name: geometryName,
          display_name: displayName,
          storage_url: publicUrl,
          file_size: JSON.stringify(geojson).length
        }]);

      if (dbError && !dbError.message.includes('duplicate key value')) {
        throw dbError;
      }

      console.log(`✅ ${file} → ${storageFileName} (${(JSON.stringify(geojson).length / 1024).toFixed(1)}KB)`);

    } catch (error) {
      console.error(`❌ Error uploading ${file}:`, error.message);
    }
  }

  console.log('\n📁 Geometry upload complete!\n');
}

// Step 2: Convert historical data to events
async function convertHistoricalDataToEvents() {
  console.log('🔄 Converting historical data to events...\n');

  const historicalDataPath = './public/data/historical_service_areas.json';
  const historicalData = JSON.parse(readFileSync(historicalDataPath, 'utf-8'));

  for (const [key, serviceArea] of Object.entries(historicalData)) {
    try {
      // Create service_created event
      const eventData = {
        event_type: 'service_created',
        aggregate_type: 'service_area',
        aggregate_id: serviceArea.deploymentId || `${serviceArea.company.toLowerCase()}-${serviceArea.name.toLowerCase().replace(/\s+/g, '-')}`,
        event_date: new Date(serviceArea.effectiveDate).toISOString(),
        event_data: {
          company: serviceArea.company,
          name: serviceArea.name,
          platform: serviceArea.platform,
          supervision: serviceArea.supervision,
          access: serviceArea.access,
          fares: serviceArea.fares,
          direct_booking: serviceArea.directBooking,
          status: serviceArea.status,
          geometry_name: serviceArea.geojsonPath ?
            serviceArea.geojsonPath.replace('/areas/', '').replace(/\.(geoJSON|geojson)$/, '').toLowerCase().replace(/\s+/g, '-') :
            null,
          notes: serviceArea.notes
        },
        source: 'historical_migration'
      };

      const { error } = await supabase
        .from('av_events')
        .insert([eventData]);

      if (error && !error.message.includes('duplicate key value')) {
        throw error;
      }

      console.log(`✅ Event: ${serviceArea.company} ${serviceArea.name} (${serviceArea.effectiveDate})`);

      // If there's an end date, create a service_ended event
      if (serviceArea.endDate) {
        const endEventData = {
          event_type: 'service_ended',
          aggregate_type: 'service_area',
          aggregate_id: eventData.aggregate_id,
          event_date: new Date(serviceArea.endDate).toISOString(),
          event_data: {
            reason: 'Historical end date from migration'
          },
          source: 'historical_migration'
        };

        const { error: endError } = await supabase
          .from('av_events')
          .insert([endEventData]);

        if (endError && !endError.message.includes('duplicate key value')) {
          console.warn(`⚠️  Could not create end event: ${endError.message}`);
        } else {
          console.log(`   └─ End event: ${serviceArea.endDate}`);
        }
      }

    } catch (error) {
      console.error(`❌ Error creating event for ${key}:`, error.message);
    }
  }

  console.log('\n🔄 Historical data conversion complete!\n');
}

// Step 3: Verify migration
async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');

  // Check geometries
  const { data: geometries, error: geoError } = await supabase
    .from('service_area_geometries')
    .select('*');

  if (geoError) {
    console.error('❌ Error checking geometries:', geoError);
  } else {
    console.log(`✅ ${geometries.length} geometries uploaded`);
  }

  // Check events
  const { data: events, error: eventsError } = await supabase
    .from('av_events')
    .select('*');

  if (eventsError) {
    console.error('❌ Error checking events:', eventsError);
  } else {
    console.log(`✅ ${events.length} events created`);
  }

  // Check storage
  const { data: files, error: storageError } = await supabase.storage
    .from('service-area-boundaries')
    .list();

  if (storageError) {
    console.error('❌ Error checking storage:', storageError);
  } else {
    console.log(`✅ ${files.length} files in storage`);
  }

  console.log('\n🎉 Migration verification complete!');
}

// Run migration
async function runMigration() {
  console.log('🚀 Starting Supabase migration...\n');

  try {
    await uploadGeometries();
    await convertHistoricalDataToEvents();
    await verifyMigration();

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your .env.local with the Supabase credentials');
    console.log('2. Test the frontend with the new data source');
    console.log('3. Deploy to Netlify with the environment variables');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}