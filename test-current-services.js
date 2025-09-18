import { createClient } from '@supabase/supabase-js';

// Get credentials from environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vbqijqcveavjycsfoszy.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicWlqcWN2ZWF2anljc2Zvc3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMzE2MTUsImV4cCI6MjA3MzcwNzYxNX0.LVmS59sfu5jkuUVhecxzNhXmowlNVqIpsE0-UtTgtNY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Copy the exact logic from eventService.ts for getCurrentServiceAreas
async function getCurrentServiceAreas() {
  const date = new Date();
  console.log('🔍 Getting all services for date:', date.toISOString());

  const { data: events, error } = await supabase
    .from('av_events')
    .select('*')
    .eq('aggregate_type', 'service_area')
    .lte('event_date', date.toISOString())
    .order('event_date', { ascending: true })

  if (error) {
    console.error('Error fetching events:', error)
    throw error
  }

  console.log('🔍 Found', events?.length || 0, 'events up to', date.toISOString());

  // Group by service and rebuild each state
  const serviceStates = new Map()

  for (const event of events) {
    const serviceId = event.aggregate_id
    const currentState = serviceStates.get(serviceId) || { isActive: false }

    console.log(`Processing ${serviceId}: ${event.event_type} on ${event.event_date}`);

    if (event.event_type === 'service_created') {
      const serviceData = {
        ...event.event_data,
        id: serviceId,
        service_id: serviceId,
        isActive: true,
        effectiveDate: event.event_date,
        startDate: event.event_date
      }

      // Ensure vehicleTypes is properly mapped from vehicle_types
      if (event.event_data.vehicle_types && !serviceData.vehicleTypes) {
        serviceData.vehicleTypes = event.event_data.vehicle_types;
      }

      serviceStates.set(serviceId, serviceData)
      console.log(`  → Created service with vehicles: ${serviceData.vehicleTypes}`);
    } else if (event.event_type === 'vehicle_types_updated') {
      if (currentState.isActive) {
        serviceStates.set(serviceId, {
          ...currentState,
          vehicleTypes: event.event_data.new_vehicle_types,
          lastUpdated: event.event_date
        })
        console.log(`  → Updated vehicles to: ${event.event_data.new_vehicle_types}`);
      }
    }
  }

  // Filter waymo-phoenix specifically
  const waymoPhoenix = serviceStates.get('waymo-phoenix');
  if (waymoPhoenix) {
    console.log('\n🎯 Waymo Phoenix final state:');
    console.log('Vehicle Types:', waymoPhoenix.vehicleTypes);
    console.log('Full object:', JSON.stringify(waymoPhoenix, null, 2));
  }

  // Return all active services
  const activeServices = Array.from(serviceStates.values())
    .filter(service => service.isActive)
    .map(service => {
      const { isActive, geometry_name, vehicle_types, ...serviceData } = service
      return {
        ...serviceData,
        geojsonPath: geometry_name,
        vehicleTypes: vehicle_types || serviceData.vehicleTypes
      }
    });

  return activeServices;
}

async function testCurrentServices() {
  try {
    const services = await getCurrentServiceAreas();
    const waymoPhoenix = services.find(s => s.id === 'waymo-phoenix');

    console.log('\n🔍 Final getCurrentServiceAreas result for Waymo Phoenix:');
    console.log('Vehicle Types:', waymoPhoenix?.vehicleTypes);
    console.log('All properties:', Object.keys(waymoPhoenix || {}));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCurrentServices();