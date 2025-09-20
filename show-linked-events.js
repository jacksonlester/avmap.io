import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)

async function showLinkedEvents() {
  // Get all events with geometry_name
  const { data: eventsWithGeometry } = await supabase
    .from('av_events')
    .select('*')
    .not('event_data->>geometry_name', 'is', null)

  console.log('=== EVENTS WITH LINKED GEOMETRIES ===')
  console.log(`Found ${eventsWithGeometry.length} events with geometry links:\n`)

  eventsWithGeometry.forEach((event, index) => {
    const eventData = event.event_data
    console.log(`${index + 1}. ${eventData.company} ${eventData.name}`)
    console.log(`   Service ID: ${event.aggregate_id}`)
    console.log(`   Geometry: ${eventData.geometry_name}`)
    console.log(`   Area: ${eventData.area_square_miles || 'Not calculated'} sq mi`)
    console.log(`   Event Date: ${event.event_date}`)
    console.log(`   Type: ${event.event_type}`)
    console.log('')
  })

  // Also show all events to see what we're missing
  const { data: allEvents } = await supabase
    .from('av_events')
    .select('aggregate_id, event_data')
    .order('aggregate_id')

  console.log('=== ALL SERVICE EVENTS (by aggregate_id) ===')
  const uniqueServices = [...new Set(allEvents.map(e => e.aggregate_id))]

  uniqueServices.forEach(serviceId => {
    const serviceEvents = allEvents.filter(e => e.aggregate_id === serviceId)
    const firstEvent = serviceEvents[0]
    const hasGeometry = firstEvent.event_data?.geometry_name ? '✅' : '❌'

    console.log(`${hasGeometry} ${serviceId}: ${firstEvent.event_data?.company} ${firstEvent.event_data?.name} (${serviceEvents.length} events)`)
  })
}

showLinkedEvents()