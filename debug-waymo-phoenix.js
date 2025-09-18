import { createClient } from '@supabase/supabase-js';

// Get credentials from environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vbqijqcveavjycsfoszy.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicWlqcWN2ZWF2anljc2Zvc3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMzE2MTUsImV4cCI6MjA3MzcwNzYxNX0.LVmS59sfu5jkuUVhecxzNhXmowlNVqIpsE0-UtTgtNY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debugWaymoPhoenix() {
  console.log('🔍 Debugging Waymo Phoenix vehicle type events...\n');

  try {
    // Get all events for waymo-phoenix ordered by date
    const { data: events, error } = await supabase
      .from('av_events')
      .select('*')
      .eq('aggregate_id', 'waymo-phoenix')
      .order('event_date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching events:', error);
      return;
    }

    console.log(`📋 Found ${events.length} events for waymo-phoenix:\n`);

    // Show all events chronologically
    events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.event_date} - ${event.event_type}`);
      if (event.event_type === 'vehicle_types_updated' || event.event_type === 'service_created') {
        const vehicleTypes = event.event_data.vehicle_types || event.event_data.new_vehicle_types;
        console.log(`   Vehicle Types: ${vehicleTypes}`);
      }
      if (event.event_data.reason) {
        console.log(`   Reason: ${event.event_data.reason}`);
      }
      console.log('');
    });

    // Test current state by simulating the event processing
    console.log('🧪 Simulating current state (2025-09-18)...\n');

    let currentState = { isActive: false };

    for (const event of events) {
      if (event.event_type === 'service_created') {
        currentState = {
          ...event.event_data,
          isActive: true,
          vehicleTypes: event.event_data.vehicle_types
        };
        console.log(`✅ Service created: ${currentState.vehicleTypes}`);
      } else if (event.event_type === 'vehicle_types_updated') {
        if (currentState.isActive) {
          currentState.vehicleTypes = event.event_data.new_vehicle_types;
          console.log(`🔄 Vehicle types updated to: ${currentState.vehicleTypes}`);
        }
      }
    }

    console.log('\n🎯 Final state for today:');
    console.log(`Vehicle Types: ${currentState.vehicleTypes}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugWaymoPhoenix();