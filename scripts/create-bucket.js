import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vbqijqcveavjycsfoszy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZicWlqcWN2ZWF2anljc2Zvc3p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMzE2MTUsImV4cCI6MjA3MzcwNzYxNX0.LVmS59sfu5jkuUVhecxzNhXmowlNVqIpsE0-UtTgtNY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createBucket() {
  console.log('🪣 Creating storage bucket...');

  try {
    const { data, error } = await supabase.storage.createBucket('service-area-boundaries', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['application/json']
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Bucket already exists');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Bucket created successfully');
    }

  } catch (error) {
    console.error('❌ Error creating bucket:', error.message);
  }
}

createBucket();