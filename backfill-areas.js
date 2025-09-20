import { createClient } from '@supabase/supabase-js'
import area from '@turf/area'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)

const metersToMiles = (areaInMeters) => {
  return areaInMeters * 3.861e-7
}

async function fetchGeoJSONFromUrl(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`)
    return await response.json()
  } catch (error) {
    console.error(`Error fetching GeoJSON from ${url}:`, error)
    return null
  }
}

async function backfillAreas() {
  // Get all geometries and their calculated areas
  const { data: geometries } = await supabase
    .from('service_area_geometries')
    .select('*')

  console.log('=== AVAILABLE GEOMETRIES AND CALCULATED AREAS ===')

  for (const geo of geometries) {
    // Calculate area for this geometry
    const geoJsonData = await fetchGeoJSONFromUrl(geo.storage_url)
    if (!geoJsonData) continue

    const areaInMeters = area(geoJsonData)
    const areaInMiles = metersToMiles(areaInMeters)

    console.log(`\n"${geo.geometry_name}": ${areaInMiles.toFixed(2)} sq mi`)
    console.log(`  Display: ${geo.display_name}`)

    // Find any events that might match this geometry
    const companyName = geo.geometry_name.split('-')[0]
    const cityName = geo.geometry_name.split('-')[1]

    console.log(`  Looking for events: company=${companyName}, city=${cityName}`)

    const { data: potentialEvents } = await supabase
      .from('av_events')
      .select('id, event_data, aggregate_id')
      .ilike('event_data->>company', `%${companyName}%`)

    if (potentialEvents?.length > 0) {
      console.log(`  Found ${potentialEvents.length} potential matching events:`)
      potentialEvents.forEach(event => {
        console.log(`    - ${event.aggregate_id}: ${event.event_data?.name} (${event.event_data?.company})`)
      })
    } else {
      console.log(`  ❌ No matching events found`)
    }
  }

  console.log('\n=== SUMMARY ===')
  console.log(`Total geometries: ${geometries.length}`)

  // Get events with areas
  const { data: eventsWithAreas } = await supabase
    .from('av_events')
    .select('event_data')
    .not('event_data->>area_square_miles', 'is', null)

  console.log(`Events with area data: ${eventsWithAreas?.length || 0}`)
  console.log(`Missing area data: ${geometries.length - (eventsWithAreas?.length || 0)}`)
}

backfillAreas()