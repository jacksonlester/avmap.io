import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)

async function debugMissingEvents() {
  // Get all geometries
  const { data: geometries } = await supabase
    .from('service_area_geometries')
    .select('geometry_name, display_name')

  // Get all events
  const { data: events } = await supabase
    .from('av_events')
    .select('event_data')

  console.log('=== GEOMETRY NAMES ===')
  geometries.forEach(g => console.log(`"${g.geometry_name}"`))

  console.log('\n=== EVENT GEOMETRY NAMES ===')
  const eventGeometryNames = events
    .map(e => e.event_data?.geometry_name)
    .filter(Boolean)
    .sort()

  eventGeometryNames.forEach(name => console.log(`"${name}"`))

  console.log('\n=== MISSING MATCHES ===')
  const geometryNames = geometries.map(g => g.geometry_name)

  geometryNames.forEach(geoName => {
    if (!eventGeometryNames.includes(geoName)) {
      console.log(`❌ No event for geometry: "${geoName}"`)
    }
  })

  console.log('\n=== STATS ===')
  console.log(`Total geometries: ${geometries.length}`)
  console.log(`Total events with geometry_name: ${eventGeometryNames.length}`)
  console.log(`Unique event geometry names: ${[...new Set(eventGeometryNames)].length}`)
}

debugMissingEvents()