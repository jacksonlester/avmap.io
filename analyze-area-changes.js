import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)

async function analyzeAreaChanges() {
  // Get all events, grouped by type
  const { data: allEvents } = await supabase
    .from('av_events')
    .select('*')
    .order('aggregate_id, event_date')

  console.log('=== SERVICE AREA CHANGE EVENTS ANALYSIS ===\n')

  // Group by service
  const serviceGroups = {}
  allEvents.forEach(event => {
    if (!serviceGroups[event.aggregate_id]) {
      serviceGroups[event.aggregate_id] = []
    }
    serviceGroups[event.aggregate_id].push(event)
  })

  let totalChangeEvents = 0
  let changesWithGeometry = 0

  Object.keys(serviceGroups).forEach(serviceId => {
    const events = serviceGroups[serviceId]
    const serviceCreated = events.find(e => e.event_type === 'service_created')
    const areaChanges = events.filter(e => e.event_type === 'service_area_change')

    console.log(`📍 ${serviceId} (${events[0].event_data?.company || 'Unknown'} ${events[0].event_data?.name || 'Unknown'})`)
    console.log(`   Total events: ${events.length}`)
    console.log(`   Service created: ${serviceCreated ? serviceCreated.event_date.split('T')[0] : 'N/A'}`)
    console.log(`   Area changes: ${areaChanges.length}`)

    if (areaChanges.length > 0) {
      console.log(`   Change dates:`)
      areaChanges.forEach(change => {
        const hasGeometry = change.event_data?.geometry_name ? '✅' : '❌'
        const area = change.event_data?.area_square_miles ? `${change.event_data.area_square_miles} sq mi` : 'No area'
        console.log(`     ${hasGeometry} ${change.event_date.split('T')[0]} - ${area}`)
        totalChangeEvents++
        if (change.event_data?.geometry_name) changesWithGeometry++
      })
    }

    // Show geometry status for service_created event
    if (serviceCreated) {
      const hasGeometry = serviceCreated.event_data?.geometry_name ? '✅' : '❌'
      const area = serviceCreated.event_data?.area_square_miles ? `${serviceCreated.event_data.area_square_miles} sq mi` : 'No area'
      console.log(`   Initial service: ${hasGeometry} ${area}`)
    }

    console.log('')
  })

  console.log('=== SUMMARY ===')
  console.log(`Total services: ${Object.keys(serviceGroups).length}`)
  console.log(`Total service_area_change events: ${totalChangeEvents}`)
  console.log(`Change events with geometry: ${changesWithGeometry}`)
  console.log(`Change events missing geometry: ${totalChangeEvents - changesWithGeometry}`)

  // Show available geometries that could match change events
  console.log('\n=== AVAILABLE GEOMETRIES FOR MATCHING ===')
  const { data: geometries } = await supabase
    .from('service_area_geometries')
    .select('geometry_name, display_name')
    .order('geometry_name')

  geometries.forEach(geo => {
    console.log(`"${geo.geometry_name}" - ${geo.display_name}`)
  })
}

analyzeAreaChanges()