import { createClient } from '@supabase/supabase-js'
import area from '@turf/area'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Convert square meters to square miles
const metersToMiles = (areaInMeters) => {
  return areaInMeters * 3.861e-7 // 1 square meter = 3.861e-7 square miles
}

async function fetchGeoJSONFromUrl(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch GeoJSON: ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`Error fetching GeoJSON from ${url}:`, error)
    return null
  }
}

async function calculateAndUpdateAreas() {
  try {
    console.log('Fetching all service area geometries...')

    // Get all geometries
    const { data: geometries, error } = await supabase
      .from('service_area_geometries')
      .select('*')

    if (error) {
      console.error('Error fetching geometries:', error)
      return
    }

    console.log(`Found ${geometries.length} geometry files to process`)

    for (const geometry of geometries) {
      console.log(`\nProcessing: ${geometry.display_name}`)

      // Fetch the GeoJSON from storage
      const geoJsonData = await fetchGeoJSONFromUrl(geometry.storage_url)

      if (!geoJsonData) {
        console.log(`❌ Skipped: ${geometry.geometry_name} - Could not fetch GeoJSON`)
        continue
      }

      // Calculate area using Turf.js
      const areaInMeters = area(geoJsonData)
      const areaInMiles = metersToMiles(areaInMeters)

      console.log(`📐 Area: ${areaInMiles.toFixed(2)} square miles`)

      // Find events that use this geometry (check both geometry_name and new_geometry_name fields)
      const { data: events1, error: eventsError1 } = await supabase
        .from('av_events')
        .select('*')
        .eq('event_data->>geometry_name', geometry.geometry_name)

      const { data: events2, error: eventsError2 } = await supabase
        .from('av_events')
        .select('*')
        .eq('event_data->>new_geometry_name', geometry.geometry_name)

      if (eventsError1 || eventsError2) {
        console.error(`❌ Error finding events for ${geometry.geometry_name}:`, eventsError1 || eventsError2)
        continue
      }

      // Combine both result sets
      const events = [...(events1 || []), ...(events2 || [])]

      console.log(`   Found ${events.length} events using this geometry`)

      // Update each event's area
      for (const event of events) {
        const updatedEventData = {
          ...event.event_data,
          area_square_miles: parseFloat(areaInMiles.toFixed(2)),
          area_calculated_at: new Date().toISOString()
        }

        // For geometry_updated events, also add geometry_name field for easier access
        if (event.event_data?.new_geometry_name && !event.event_data?.geometry_name) {
          updatedEventData.geometry_name = event.event_data.new_geometry_name
        }

        const { error: updateError } = await supabase
          .from('av_events')
          .update({ event_data: updatedEventData })
          .eq('id', event.id)

        if (updateError) {
          console.error(`❌ Error updating event ${event.id}:`, updateError)
        }
      }

      console.log(`✅ Updated ${events.length} events with area: ${areaInMiles.toFixed(2)} sq mi`)

      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('\n🎉 Area calculation complete!')

  } catch (error) {
    console.error('Error:', error)
  }
}

calculateAndUpdateAreas()