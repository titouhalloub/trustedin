// pages/api/papo/generate-pro.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { v0 } from 'v0-sdk';

const CREDIT_COST = 5;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Credit check
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }
    if ((profile.credits ?? 0) < CREDIT_COST) {
      return res.status(403).json({
        error: `Insufficient credits. This action costs ${CREDIT_COST} credits.`,
      });
    }

    // Call v0
    const chat = await v0.chats.create({
      message: prompt,
      chatPrivacy: 'public',
    });

    // Narrow the union: v0.chats.create returns either a chat detail or a
    // ReadableStream (for streaming mode). We did not request streaming.
    if (!chat || typeof chat !== 'object' || !('id' in chat)) {
      return res.status(502).json({ error: 'Unexpected response from v0' });
    }
    const chatDetail = chat as {
      id: string;
      webUrl?: string;
      name?: string;
      title?: string;
      latestVersion?: {
        id?: string;
        demoUrl?: string;
        screenshotUrl?: string;
      };
    };

    const demoUrl = chatDetail.latestVersion?.demoUrl;
    const screenshotUrl = chatDetail.latestVersion?.screenshotUrl;
    const headline = chatDetail.name || chatDetail.title || 'Untitled Papo';

    // Build slug
    const slugBase = headline
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '')
      .slice(0, 60) || 'papo';
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    // Insert papo row
    const { data: papo, error: insertError } = await supabase
      .from('papo')
      .insert({
        user_id: user.id,
        title: headline,
        prompt_used: prompt,
        ai_generated_content: null,
        slug,
        engine: 'v0',
        external_url: demoUrl || chatDetail.webUrl || null,
        external_project_id: chatDetail.id,
        preview_image_url: screenshotUrl || null,
        visibility: 'public',
        metadata: {
          headline,
          description: prompt.slice(0, 200),
          tags: [],
        },
      })
      .select()
      .single();

    if (insertError || !papo) {
      console.error('Papo insert failed:', insertError);
      return res.status(500).json({ error: insertError?.message || 'Failed to save Papo' });
    }

    // Deduct credits (only after successful insert)
    const { error: creditError } = await supabase.rpc('handle_credit_transaction', {
      p_user_id: user.id,
      p_amount: -CREDIT_COST,
      p_reason: 'premium_feature',
    });

    if (creditError) {
      console.error('Credit deduction failed (Papo already created):', creditError);
      // Do not fail the request — the Papo exists.
    }

    return res.status(200).json({
      papo,
      redirectTo: `/papo/${profile.username}/${slug}`,
    });
  } catch (error: any) {
    console.error('generate-pro error:', error);
    return res.status(500).json({
      error: 'Failed to generate Papo',
      detail: error?.message || String(error),
    });
  }
}
