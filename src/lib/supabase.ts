import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types for your Event Sourcing tables
export type AVEvent = {
  id: string
  event_type: string
  aggregate_type: string
  aggregate_id: string
  event_date: string
  event_data: any
  source: string
  version: number
  created_at: string
}

export type ServiceAreaGeometry = {
  id: string
  geometry_name: string
  display_name: string
  storage_url: string
  file_size?: number
  created_at: string
}

export type NewsSource = {
  id: string
  title: string
  content?: string
  url?: string
  published_date?: string
  source?: string
  tags?: string[]
  companies?: string[]
  locations?: string[]
  created_at: string
}