// pages/api/papo/status/[papoId].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { v0 } from 'v0-sdk';
import { cacheScreenshot } from '@/lib/screenshotCache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { papoId } = req.query;
  if (!papoId || typeof papoId !== 'string') {
    return res.status(400).json({ error: 'papoId is required' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // NOTE: user_metadata.username is never populated for email/password signups or
    // OAuth users (only one legacy signup path), so resolve the real username from
    // profiles — otherwise redirectTo would be /papo/unknown/...
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();
    const username = profile?.username || user.user_metadata?.username || 'unknown';

    const { data: papo, error: papoError } = await supabase
      .from('papo')
      .select('id, user_id, slug, external_url, external_project_id, preview_image_url, metadata')
      .eq('id', papoId)
      .single();

    if (papoError || !papo) {
      return res.status(404).json({ error: 'Papo not found' });
    }

    // Already resolved (external_url populated) — return ready
    if (papo.external_url) {
      return res.status(200).json({
        status: 'ready',
        external_url: papo.external_url,
        redirectTo: `/papo/${username}/${papo.slug}`,
      });
    }

    if (!papo.external_project_id) {
      return res.status(500).json({ error: 'Papo has no v0 chat id' });
    }

    // Fetch fresh state from v0
    const chat = await v0.chats.getById({ chatId: papo.external_project_id });
    if (!chat || typeof chat !== 'object' || !('id' in chat)) {
      return res.status(502).json({ error: 'Unexpected v0 response' });
    }

    const chatAny = chat as any;
    const latestVersion = chatAny.latestVersion;
    const versionStatus: string | undefined = latestVersion?.status;
    const demoUrl: string | undefined = latestVersion?.demoUrl;
    const screenshotUrl: string | undefined = latestVersion?.screenshotUrl;

    if (versionStatus === 'completed' && demoUrl) {
      let permanentScreenshotUrl: string | null = null;

      // Download the screenshot bytes from v0 (auth required), then cache in Supabase Storage
      if (screenshotUrl) {
        try {
          const imgRes = await fetch(screenshotUrl, {
            headers: { Authorization: `Bearer ${process.env.V0_API_KEY}` },
          });
          if (imgRes.ok) {
            const contentType = imgRes.headers.get('content-type') || 'image/png';
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            permanentScreenshotUrl = await cacheScreenshot(papo.id, buffer, contentType);
          } else {
            console.error('Screenshot fetch failed with status:', imgRes.status);
          }
        } catch (cacheErr) {
          console.error('Screenshot caching failed; falling back to raw URL:', cacheErr);
        }
      }

      await supabase
        .from('papo')
        .update({
          external_url: demoUrl,
          preview_image_url: permanentScreenshotUrl || screenshotUrl || null,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', papo.id);

      return res.status(200).json({
        status: 'ready',
        external_url: demoUrl,
        redirectTo: `/papo/${username}/${papo.slug}`,
      });
    }

    if (versionStatus === 'failed') {
      // Refund credits since v0 failed
      const { error: refundErr } = await supabase.rpc('handle_credit_transaction', {
        p_user_id: papo.user_id,
        p_amount: 5,
        p_reason: 'verification_reward', // closest valid "earn" reason
      });
      if (refundErr) console.error('Refund failed:', refundErr);

      return res.status(200).json({ status: 'failed', message: 'v0 build failed. Credits refunded.' });
    }

    // Still pending
    return res.status(200).json({ status: 'pending' });
  } catch (error: any) {
    console.error('Papo status error:', error);
    return res.status(500).json({ error: 'Status check failed', detail: error?.message });
  }
}
