import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)

async function checkEventTypes() {
  // Get all events with their types
  const { data: allEvents } = await supabase
    .from('av_events')
    .select('*')
    .order('aggregate_id, event_date')

  console.log('=== ALL EVENT TYPES ===')
  const eventTypes = {}
  allEvents.forEach(event => {
    if (!eventTypes[event.event_type]) {
      eventTypes[event.event_type] = 0
    }
    eventTypes[event.event_type]++
  })

  Object.keys(eventTypes).forEach(type => {
    console.log(`${type}: ${eventTypes[type]} events`)
  })

  console.log('\n=== EVENTS BY SERVICE ===')
  const serviceGroups = {}
  allEvents.forEach(event => {
    if (!serviceGroups[event.aggregate_id]) {
      serviceGroups[event.aggregate_id] = []
    }
    serviceGroups[event.aggregate_id].push(event)
  })

  Object.keys(serviceGroups).forEach(serviceId => {
    const events = serviceGroups[serviceId]
    console.log(`\n📍 ${serviceId} (${events.length} events)`)

    events.forEach(event => {
      const hasGeometry = event.event_data?.geometry_name ? '✅' : '❌'
      const area = event.event_data?.area_square_miles ? `${event.event_data.area_square_miles} sq mi` : 'No area'
      console.log(`   ${hasGeometry} ${event.event_date.split('T')[0]} - ${event.event_type} - ${area}`)
      if (event.event_data?.geometry_name) {
        console.log(`     Geometry: ${event.event_data.geometry_name}`)
      }
    })
  })

  console.log('\n=== SAMPLE EVENT DATA ===')
  console.log('First few events with full data:')
  allEvents.slice(0, 3).forEach((event, i) => {
    console.log(`\n${i + 1}. Event ID: ${event.id}`)
    console.log(`   Type: ${event.event_type}`)
    console.log(`   Service: ${event.aggregate_id}`)
    console.log(`   Date: ${event.event_date}`)
    console.log(`   Data:`, JSON.stringify(event.event_data, null, 2))
  })
}

checkEventTypes()