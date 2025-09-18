import { supabase } from './supabase'
import type { AVEvent } from './supabase'

// Get service state at a specific date
export async function getServiceStateAtDate(serviceId: string, date: Date) {
  const { data, error } = await supabase
    .rpc('get_service_state_at_date', {
      service_id: serviceId,
      target_date: date.toISOString()
    })

  if (error) {
    console.error('Error getting service state:', error)
    throw error
  }

  return data
}

// Get all services at a specific date
export async function getAllServicesAtDate(date: Date) {
  console.log('🔍 getAllServicesAtDate called for:', date.toISOString());

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

    if (event.event_type === 'service_created') {
      const serviceData = {
        ...event.event_data,
        id: serviceId,
        service_id: serviceId,
        isActive: true,
        effectiveDate: event.event_date,
        lastUpdated: event.event_date
      };

      // Ensure vehicleTypes is properly mapped from vehicle_types
      if (event.event_data.vehicle_types && !serviceData.vehicleTypes) {
        serviceData.vehicleTypes = event.event_data.vehicle_types;
      }

      serviceStates.set(serviceId, serviceData)
    } else if (event.event_type === 'service_ended') {
      if (currentState.isActive) {
        serviceStates.set(serviceId, { ...currentState, isActive: false, endDate: event.event_date })
      }
    } else if (event.event_type === 'service_updated') {
      if (currentState.isActive) {
        serviceStates.set(serviceId, { ...currentState, ...event.event_data, lastUpdated: event.event_date })
      }
    } else if (event.event_type === 'fares_policy_changed') {
      if (currentState.isActive) {
        serviceStates.set(serviceId, {
          ...currentState,
          fares: event.event_data.new_fares,
          lastUpdated: event.event_date
        })
      }
    } else if (event.event_type === 'access_policy_changed') {
      if (currentState.isActive) {
        serviceStates.set(serviceId, {
          ...currentState,
          access: event.event_data.new_access,
          lastUpdated: event.event_date
        })
      }
    } else if (event.event_type === 'geometry_updated') {
      if (currentState.isActive) {
        serviceStates.set(serviceId, {
          ...currentState,
          geometry_name: event.event_data.new_geometry_name,
          lastUpdated: event.event_date
        })
      }
    } else if (event.event_type === 'vehicle_types_updated') {
      if (currentState.isActive) {
        serviceStates.set(serviceId, {
          ...currentState,
          vehicleTypes: event.event_data.new_vehicle_types,
          lastUpdated: event.event_date
        })
      }
    } else if (event.event_type === 'platform_updated') {
      if (currentState.isActive) {
        serviceStates.set(serviceId, {
          ...currentState,
          platform: event.event_data.new_platform,
          lastUpdated: event.event_date
        })
      }
    } else if (event.event_type === 'supervision_updated') {
      if (currentState.isActive) {
        serviceStates.set(serviceId, {
          ...currentState,
          supervision: event.event_data.new_supervision,
          lastUpdated: event.event_date
        })
      }
    } else if (event.event_type === 'Service Area Change') {
      // Handle CSV event type for geometry updates
      if (currentState.isActive) {
        serviceStates.set(serviceId, {
          ...currentState,
          geometry_name: event.event_data.geometry_name,
          lastUpdated: event.event_date
        })
      }
    } else if (event.event_type === 'Access Change') {
      // Handle CSV event type for access changes
      if (currentState.isActive) {
        serviceStates.set(serviceId, {
          ...currentState,
          access: event.event_data.access,
          lastUpdated: event.event_date
        })
      }
    } else if (event.event_type === 'Fares Change') {
      // Handle CSV event type for fares changes
      if (currentState.isActive) {
        serviceStates.set(serviceId, {
          ...currentState,
          fares: event.event_data.fares,
          lastUpdated: event.event_date
        })
      }
    } else if (event.event_type === 'Vehicle Change') {
      // Handle CSV event type for vehicle updates
      if (currentState.isActive) {
        serviceStates.set(serviceId, {
          ...currentState,
          vehicleTypes: event.event_data.vehicleTypes,
          lastUpdated: event.event_date
        })
      }
    } else if (event.event_type === 'Supervision Change') {
      // Handle CSV event type for supervision updates
      if (currentState.isActive) {
        serviceStates.set(serviceId, {
          ...currentState,
          supervision: event.event_data.supervision,
          lastUpdated: event.event_date
        })
      }
    }
  }

  // Filter out inactive services and remove the isActive flag
  const activeServices = Array.from(serviceStates.values())
    .filter(service => service.isActive)
    .map(service => {
      const { isActive, geometry_name, vehicle_types, ...serviceData } = service
      return {
        ...serviceData,
        geojsonPath: geometry_name, // Map geometry_name to geojsonPath for frontend compatibility
        vehicleTypes: serviceData.vehicleTypes || vehicle_types // Prioritize updated vehicleTypes over original vehicle_types
      }
    });

  console.log('🔍 Returning', activeServices.length, 'active services for', date.toISOString());
  activeServices.forEach(service => {
    console.log('🔍 -', service.name, service.company, 'effectiveDate:', service.effectiveDate);
  });

  return activeServices;
}

// Get current service areas (services active today)
export async function getCurrentServiceAreas() {
  return await getAllServicesAtDate(new Date());
}

// Add a new event
export async function addEvent(eventData: {
  event_type: string
  aggregate_type: string
  aggregate_id: string
  event_date: Date
  event_data: any
  source?: string
}) {
  const { data, error } = await supabase
    .from('av_events')
    .insert([{
      ...eventData,
      event_date: eventData.event_date.toISOString()
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

// Get all events for a service (for debugging/history view)
export async function getServiceEvents(serviceId: string) {
  const { data, error } = await supabase
    .from('av_events')
    .select('*')
    .eq('aggregate_id', serviceId)
    .order('event_date', { ascending: true })

  if (error) throw error
  return data
}

// Get recent events (for activity feed)
export async function getRecentEvents(limit: number = 20) {
  const { data, error } = await supabase
    .from('av_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// Get all unique historical service area states across all time periods
// This creates a comprehensive list of every service state that ever existed
export async function getAllHistoricalServiceStates() {
  const { data: events, error } = await supabase
    .from('av_events')
    .select('*')
    .eq('aggregate_type', 'service_area')
    .order('event_date', { ascending: true })

  if (error) {
    console.error('Error fetching historical events:', error)
    throw error
  }

  // Group by service and track every unique state
  const allStates = new Map()
  const serviceStates = new Map()

  for (const event of events) {
    const serviceId = event.aggregate_id
    const currentState = serviceStates.get(serviceId) || { isActive: false }

    if (event.event_type === 'service_created') {
      const newState = {
        ...event.event_data,
        id: serviceId,
        service_id: serviceId,
        isActive: true,
        effectiveDate: event.event_date,
        lastUpdated: event.event_date
      };

      // Ensure vehicleTypes is properly mapped from vehicle_types
      if (event.event_data.vehicle_types && !newState.vehicleTypes) {
        newState.vehicleTypes = event.event_data.vehicle_types;
      }

      serviceStates.set(serviceId, newState)

      // Store this state with a unique key including geometry name
      const stateKey = `${serviceId}-${newState.geometry_name}`
      if (!allStates.has(stateKey)) {
        allStates.set(stateKey, newState)
      }
    } else if (event.event_type === 'service_ended') {
      if (currentState.isActive) {
        serviceStates.set(serviceId, { ...currentState, isActive: false, endDate: event.event_date })
      }
    } else if (event.event_type === 'service_updated') {
      if (currentState.isActive) {
        const updatedState = { ...currentState, ...event.event_data, lastUpdated: event.event_date }
        serviceStates.set(serviceId, updatedState)

        // Store this updated state if it has a different geometry
        if (event.event_data.geometry_name) {
          const stateKey = `${serviceId}-${event.event_data.geometry_name}`
          if (!allStates.has(stateKey)) {
            allStates.set(stateKey, updatedState)
          }
        }
      }
    } else if (event.event_type === 'fares_policy_changed') {
      if (currentState.isActive) {
        serviceStates.set(serviceId, {
          ...currentState,
          fares: event.event_data.new_fares,
          lastUpdated: event.event_date
        })
      }
    } else if (event.event_type === 'access_policy_changed') {
      if (currentState.isActive) {
        serviceStates.set(serviceId, {
          ...currentState,
          access: event.event_data.new_access,
          lastUpdated: event.event_date
        })
      }
    } else if (event.event_type === 'geometry_updated') {
      if (currentState.isActive) {
        const updatedState = {
          ...currentState,
          geometry_name: event.event_data.new_geometry_name,
          lastUpdated: event.event_date
        }
        serviceStates.set(serviceId, updatedState)

        // Store this new geometry state
        const stateKey = `${serviceId}-${event.event_data.new_geometry_name}`
        if (!allStates.has(stateKey)) {
          allStates.set(stateKey, updatedState)
        }
      }
    } else if (event.event_type === 'vehicle_types_updated') {
      if (currentState.isActive) {
        const updatedState = {
          ...currentState,
          vehicleTypes: event.event_data.new_vehicle_types,
          lastUpdated: event.event_date
        }
        serviceStates.set(serviceId, updatedState)

        // Store this updated state with vehicle types
        const stateKey = `${serviceId}-${currentState.geometry_name}`
        if (allStates.has(stateKey)) {
          // Update existing state with vehicle types
          allStates.set(stateKey, updatedState)
        }
      }
    } else if (event.event_type === 'platform_updated') {
      if (currentState.isActive) {
        const updatedState = {
          ...currentState,
          platform: event.event_data.new_platform,
          lastUpdated: event.event_date
        }
        serviceStates.set(serviceId, updatedState)

        // Update existing state
        const stateKey = `${serviceId}-${currentState.geometry_name}`
        if (allStates.has(stateKey)) {
          allStates.set(stateKey, updatedState)
        }
      }
    } else if (event.event_type === 'supervision_updated') {
      if (currentState.isActive) {
        const updatedState = {
          ...currentState,
          supervision: event.event_data.new_supervision,
          lastUpdated: event.event_date
        }
        serviceStates.set(serviceId, updatedState)

        // Update existing state
        const stateKey = `${serviceId}-${currentState.geometry_name}`
        if (allStates.has(stateKey)) {
          allStates.set(stateKey, updatedState)
        }
      }
    }
  }

  // Return all unique states with geometry name mapped to geojsonPath
  return Array.from(allStates.values()).map(state => {
    const { geometry_name, vehicle_types, ...stateData } = state
    return {
      ...stateData,
      geojsonPath: geometry_name,
      vehicleTypes: stateData.vehicleTypes || vehicle_types // Prioritize updated vehicleTypes over original vehicle_types
    }
  })
}