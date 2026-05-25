import { supabase } from './supabase'

export async function uploadImage(
  file: File,
  bucket: string,
  path: string
): Promise<{ url: string | null; error: Error | null }> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${path}/${Date.now()}.${fileExt}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

  if (error) return { url: null, error }

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
  return { url: data.publicUrl, error: null }
}

export async function deleteImage(
  bucket: string,
  path: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.storage.from(bucket).remove([path])
  return { error }
}
