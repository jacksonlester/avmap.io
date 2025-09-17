import { supabase } from './supabase'

// Upload a geometry file to Supabase Storage
export async function uploadGeometry(
  fileName: string,
  geojsonData: any,
  displayName: string
) {
  try {
    // 1. Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('service-area-boundaries')
      .upload(fileName, JSON.stringify(geojsonData, null, 2), {
        contentType: 'application/json',
        upsert: true // Allow overwriting
      })

    if (uploadError) throw uploadError

    // 2. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('service-area-boundaries')
      .getPublicUrl(fileName)

    // 3. Calculate file size
    const fileSize = JSON.stringify(geojsonData).length

    // 4. Store metadata in database
    const { data: dbData, error: dbError } = await supabase
      .from('service_area_geometries')
      .insert([{
        geometry_name: fileName.replace('.geojson', ''),
        display_name: displayName,
        storage_url: publicUrl,
        file_size: fileSize
      }])
      .select()
      .single()

    if (dbError) throw dbError

    console.log(`✅ Uploaded: ${fileName} (${(fileSize / 1024).toFixed(1)}KB)`)
    return { uploadData, dbData, publicUrl }

  } catch (error) {
    console.error(`❌ Error uploading ${fileName}:`, error)
    throw error
  }
}

// Load geometry from storage
export async function loadGeometry(geometryName: string) {
  try {
    // 1. Get metadata from database
    const { data: metadata, error: metadataError } = await supabase
      .from('service_area_geometries')
      .select('*')
      .eq('geometry_name', geometryName)
      .single()

    if (metadataError) throw metadataError

    // 2. Fetch geometry from storage URL
    const response = await fetch(metadata.storage_url)
    if (!response.ok) {
      throw new Error(`Failed to fetch geometry: ${response.statusText}`)
    }

    const geojson = await response.json()
    return geojson

  } catch (error) {
    console.error(`Error loading geometry ${geometryName}:`, error)
    throw error
  }
}

// Get all geometry metadata
export async function getAllGeometries() {
  const { data, error } = await supabase
    .from('service_area_geometries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Delete geometry (both file and metadata)
export async function deleteGeometry(geometryName: string) {
  try {
    // 1. Delete from storage
    const { error: storageError } = await supabase.storage
      .from('service-area-boundaries')
      .remove([`${geometryName}.geojson`])

    if (storageError) throw storageError

    // 2. Delete metadata from database
    const { error: dbError } = await supabase
      .from('service_area_geometries')
      .delete()
      .eq('geometry_name', geometryName)

    if (dbError) throw dbError

    console.log(`✅ Deleted: ${geometryName}`)

  } catch (error) {
    console.error(`❌ Error deleting ${geometryName}:`, error)
    throw error
  }
}