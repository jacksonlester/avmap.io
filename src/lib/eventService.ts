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
  const { data: events, error } = await supabase
    .from('av_events')
    .select('*')
    .eq('aggregate_type', 'service_area')
    .lte('event_date', date.toISOString())
    .order('event_date', { ascending: true })

  if (error) throw error

  // Group by service and rebuild each state
  const serviceStates = new Map()

  for (const event of events) {
    const serviceId = event.aggregate_id
    const currentState = serviceStates.get(serviceId) || { isActive: false }

    if (event.event_type === 'service_created') {
      serviceStates.set(serviceId, {
        ...event.event_data,
        id: serviceId,
        service_id: serviceId,
        isActive: true,
        effectiveDate: event.event_date,
        lastUpdated: event.event_date
      })
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
    }
  }

  // Filter out inactive services and remove the isActive flag
  return Array.from(serviceStates.values())
    .filter(service => service.isActive)
    .map(service => {
      const { isActive, geometry_name, ...serviceData } = service
      return {
        ...serviceData,
        geometryName: geometry_name // Map geometry_name to geometryName for frontend compatibility
      }
    })
}

// Get current service areas (services active today)
export async function getCurrentServiceAreas() {
  return getAllServicesAtDate(new Date())
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

  if (error) throw error

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
    }
  }

  // Return all unique states with geometry name mapped to geometryName
  return Array.from(allStates.values()).map(state => {
    const { geometry_name, ...stateData } = state
    return {
      ...stateData,
      geometryName: geometry_name
    }
  })
}