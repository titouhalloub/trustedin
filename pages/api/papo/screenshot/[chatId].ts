// pages/api/papo/screenshot/[chatId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { v0 } from 'v0-sdk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { chatId } = req.query;
  if (!chatId || typeof chatId !== 'string') {
    return res.status(400).json({ error: 'chatId is required' });
  }

  try {
    // Step 1 — fetch the current chat detail (fresh screenshotUrl every time)
    const chat = await v0.chats.getById({ chatId });

    if (!chat || typeof chat !== 'object' || !('id' in chat)) {
      return res.status(502).json({ error: 'Unexpected v0 response' });
    }

    const screenshotUrl = (chat as any).latestVersion?.screenshotUrl;
    if (!screenshotUrl) {
      return res.status(404).json({ error: 'No screenshot available' });
    }

    // Step 2 — fetch the image with the auth header
    const imageRes = await fetch(screenshotUrl, {
      headers: {
        Authorization: `Bearer ${process.env.V0_API_KEY}`,
      },
    });

    if (!imageRes.ok) {
      return res.status(imageRes.status).json({ error: 'Failed to fetch screenshot' });
    }

    const contentType = imageRes.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await imageRes.arrayBuffer());

    // Cache aggressively — v0 caches for ~1 week, so we do too
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400');
    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error('Screenshot proxy error:', error);
    return res.status(500).json({ error: 'Screenshot proxy failed', detail: error?.message });
  }
}
