import { createClient } from '@/lib/supabase/client'

export async function uploadImageToStorage(file: File, storeId: string): Promise<string> {
  const supabase = createClient()
  
  // Generate unique filename
  const timestamp = Date.now()
  const extension = file.name.split('.').pop() || 'jpg'
  const filename = `${storeId}/${timestamp}.${extension}`
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('store-images')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) {
    throw new Error(`Storage upload error: ${error.message}`)
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('store-images')
    .getPublicUrl(filename)
  
  return urlData.publicUrl
}

export async function deleteImageFromStorage(imageUrl: string): Promise<void> {
  const supabase = createClient()
  
  // Extract filename from URL
  const urlParts = imageUrl.split('/')
  const filename = urlParts.slice(-2).join('/') // storeId/timestamp.ext
  
  const { error } = await supabase.storage
    .from('store-images')
    .remove([filename])
  
  if (error) {
    // ignore deletion error in production
  }
}