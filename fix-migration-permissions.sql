-- Run this in Supabase SQL Editor to fix migration permissions

-- Temporarily allow inserts for migration
CREATE POLICY "Allow inserts for migration" ON av_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow inserts for geometries" ON service_area_geometries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow inserts for news" ON news_sources
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to upload to storage
CREATE POLICY "Allow upload for migration" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'service-area-boundaries');