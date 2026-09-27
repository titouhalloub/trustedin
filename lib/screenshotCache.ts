// lib/screenshotCache.ts
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'papo-screenshots';

// Server-side client with service role (bypasses RLS for writes)
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase URL or service role key missing');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Uploads a screenshot buffer to Supabase Storage.
 * Returns the public URL on success, null on failure.
 */
export async function cacheScreenshot(
  papoId: string,
  buffer: Buffer | Uint8Array,
  contentType: string
): Promise<string | null> {
  try {
    const supabase = getAdminClient();
    const path = `${papoId}.png`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      console.error('cacheScreenshot upload failed:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error('cacheScreenshot exception:', err);
    return null;
  }
}

/**
 * Returns the public URL for a papo's cached screenshot without uploading.
 * Does not verify the file exists.
 */
export function getCachedScreenshotUrl(papoId: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL missing');
  return `${url}/storage/v1/object/public/${BUCKET}/${papoId}.png`;
}
