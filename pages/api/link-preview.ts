import { getLinkPreview } from 'link-preview-js';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  if (typeof url !== 'string' || !url) {
    return res.status(400).json({ error: 'A valid URL parameter is required.' });
  }

  console.log(`[DEBUG] API: Received request for URL: ${url}`);

  try {
    // The `getLinkPreview` function can sometimes be slow, so we'll set a timeout.
    const preview = await getLinkPreview(url, { timeout: 3000 });

    console.log('[DEBUG] API: Raw preview data from getLinkPreview:', JSON.stringify(preview, null, 2));

    // Check if the preview object is valid and has a title.
    if (!preview || !('url' in preview) || !('title' in preview)) {
      console.log('[DEBUG] API: Preview generation failed. Not enough data from getLinkPreview.');
      return res.status(404).json({ error: 'Could not generate a valid preview for this link.' });
    }

    // Helper to robustly extract the best possible image URL from the preview data.
    const getImageUrl = (p: any): string => {
      const ogImage = p.ogImage;
      console.log('[DEBUG] API: Checking for ogImage:', JSON.stringify(ogImage));
      if (ogImage) {
        // It can be a string or an array of objects.
        if (typeof ogImage === 'string') {
          console.log('[DEBUG] API: ogImage is a string.');
          return ogImage;
        }
        if (Array.isArray(ogImage) && ogImage.length > 0 && ogImage[0].url) {
          console.log('[DEBUG] API: ogImage is an array, using first element url.');
          return ogImage[0].url;
        }
        // This is the missing case: ogImage is a single object with a 'url' property.
        if (typeof ogImage === 'object' && ogImage !== null && !Array.isArray(ogImage) && ogImage.url) {
          console.log('[DEBUG] API: ogImage is a single object, using its url property.');
          return ogImage.url;
        }
      }
      // Fallback to other images or favicons.
      console.log('[DEBUG] API: ogImage not found or invalid. Checking for fallback images.');
      if (p.images && p.images.length > 0) {
        console.log('[DEBUG] API: Using fallback from images array.');
        return p.images[0];
      }
      if (p.favicons && p.favicons.length > 0) return p.favicons[0];
      return '';
    }

    const imageUrl = getImageUrl(preview);
    console.log(`[DEBUG] API: Final image URL selected: ${imageUrl}`);

    // Prioritize Open Graph (og) tags for better preview quality, with fallbacks.
    const filteredPreview = {
      url: preview.url,
      title: (preview as any).ogTitle || preview.title,
      description: (preview as any).ogDescription || preview.description || '',
      image: imageUrl,
    };

    console.log('[DEBUG] API: Sending final filtered preview to client:', filteredPreview);
    return res.status(200).json(filteredPreview);

  } catch (error: any) {
    return res.status(500).json({ error: `Failed to fetch link preview: ${error.message}` });
  }
}