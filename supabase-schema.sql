-- AV Map Event Sourcing Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Main events table (Event Store)
CREATE TABLE av_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_data JSONB NOT NULL,
  source TEXT DEFAULT 'manual',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Service area geometries metadata
CREATE TABLE service_area_geometries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  geometry_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. News sources
CREATE TABLE news_sources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  published_date TIMESTAMPTZ,
  source TEXT,
  tags TEXT[],
  companies TEXT[],
  locations TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX idx_av_events_aggregate ON av_events(aggregate_type, aggregate_id);
CREATE INDEX idx_av_events_date ON av_events(event_date);
CREATE INDEX idx_av_events_type ON av_events(event_type);
CREATE INDEX idx_av_events_created_at ON av_events(created_at);

CREATE INDEX idx_geometries_name ON service_area_geometries(geometry_name);

CREATE INDEX idx_news_published_date ON news_sources(published_date DESC);
CREATE INDEX idx_news_companies ON news_sources USING GIN(companies);
CREATE INDEX idx_news_locations ON news_sources USING GIN(locations);

-- 5. Create a view for current service states
CREATE OR REPLACE VIEW current_service_areas AS
WITH latest_events AS (
  SELECT DISTINCT ON (aggregate_id)
    aggregate_id,
    event_data,
    event_date,
    event_type
  FROM av_events
  WHERE aggregate_type = 'service_area'
    AND event_type IN ('service_created', 'service_updated')
  ORDER BY aggregate_id, event_date DESC
)
SELECT
  aggregate_id as service_id,
  event_data,
  event_date as last_updated
FROM latest_events;

-- 6. Function to get service state at any date
CREATE OR REPLACE FUNCTION get_service_state_at_date(
  service_id TEXT,
  target_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB := '{}';
  event_record RECORD;
BEGIN
  -- Get all events for this service up to the target date
  FOR event_record IN
    SELECT event_type, event_data, event_date
    FROM av_events
    WHERE aggregate_id = service_id
      AND aggregate_type = 'service_area'
      AND event_date <= target_date
    ORDER BY event_date ASC
  LOOP
    -- Apply events in chronological order
    IF event_record.event_type = 'service_created' THEN
      result := event_record.event_data;
    ELSIF event_record.event_type = 'service_updated' THEN
      result := result || event_record.event_data;
    ELSIF event_record.event_type = 'fares_policy_changed' THEN
      result := jsonb_set(result, '{fares}', to_jsonb(event_record.event_data->>'new_fares'));
    ELSIF event_record.event_type = 'access_policy_changed' THEN
      result := jsonb_set(result, '{access}', to_jsonb(event_record.event_data->>'new_access'));
    ELSIF event_record.event_type = 'geometry_updated' THEN
      result := jsonb_set(result, '{geometry_name}', to_jsonb(event_record.event_data->>'new_geometry_name'));
    END IF;
  END LOOP;

  RETURN result;
END;
$$;

-- 7. Enable Row Level Security (RLS)
ALTER TABLE av_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_area_geometries ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;

-- 8. Create policies for public read access
CREATE POLICY "Public read access for events" ON av_events
  FOR SELECT USING (true);

CREATE POLICY "Public read access for geometries" ON service_area_geometries
  FOR SELECT USING (true);

CREATE POLICY "Public read access for news" ON news_sources
  FOR SELECT USING (true);

-- 9. Create storage bucket for service area files
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-area-boundaries', 'service-area-boundaries', true);

-- 10. Create storage policy for public access
CREATE POLICY "Public read access for boundaries" ON storage.objects
  FOR SELECT USING (bucket_id = 'service-area-boundaries');

CREATE POLICY "Authenticated users can upload boundaries" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'service-area-boundaries' AND auth.role() = 'authenticated');

COMMENT ON TABLE av_events IS 'Event store for all AV service changes';
COMMENT ON TABLE service_area_geometries IS 'Metadata for service area boundary files';
COMMENT ON TABLE news_sources IS 'News articles and sources about AV services';
COMMENT ON FUNCTION get_service_state_at_date IS 'Get the state of a service at any point in time';