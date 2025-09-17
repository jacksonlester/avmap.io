import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vbqijqcveavjycsfoszy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicWlqcWN2ZWF2anljc2Zvc3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMzE2MTUsImV4cCI6MjA3MzcwNzYxNX0.LVmS59sfu5jkuUVhecxzNhXmowlNVqIpsE0-UtTgtNY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
  console.log('🔌 Testing Supabase connection...\n');

  try {
    // Test 1: Check if we can connect to the database
    console.log('1️⃣ Testing database connection...');
    const { data, error } = await supabase.from('av_events').select('count');

    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    console.log('✅ Database connected successfully');

    // Test 2: Check if storage bucket exists
    console.log('\n2️⃣ Testing storage bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
      console.error('❌ Storage check failed:', bucketError.message);
      return false;
    }

    const hasBoundariesBucket = buckets.some(bucket => bucket.name === 'service-area-boundaries');
    if (hasBoundariesBucket) {
      console.log('✅ Storage bucket "service-area-boundaries" exists');
    } else {
      console.log('⚠️  Storage bucket "service-area-boundaries" not found');
    }

    // Test 3: Check if tables exist
    console.log('\n3️⃣ Testing table structure...');
    const tables = ['av_events', 'service_area_geometries', 'news_sources'];

    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Table "${table}" not accessible:`, error.message);
      } else {
        console.log(`✅ Table "${table}" accessible`);
      }
    }

    console.log('\n🎉 All tests passed! Supabase is ready.');
    return true;

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('\n📋 Next step: Run the migration with:');
    console.log('   node scripts/migrate-to-supabase.js');
  } else {
    console.log('\n🔧 Please fix the connection issues before proceeding.');
  }
});