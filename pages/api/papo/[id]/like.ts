// pages/api/papo/[id]/like.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Papo ID is required' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Check current state
    const { data: existing } = await supabase
      .from('papo_likes')
      .select('id')
      .eq('papo_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    let liked: boolean;

    if (existing) {
      const { error: delErr } = await supabase
        .from('papo_likes')
        .delete()
        .eq('id', existing.id);
      if (delErr) throw delErr;
      liked = false;
    } else {
      const { error: insErr } = await supabase
        .from('papo_likes')
        .insert({ papo_id: id, user_id: user.id });
      if (insErr) throw insErr;
      liked = true;
    }

    // Read fresh count from papo.likes (kept in sync by trigger_sync_papo_likes)
    const { data: papoRow, error: readErr } = await supabase
      .from('papo')
      .select('likes')
      .eq('id', id)
      .single();

    if (readErr) throw readErr;

    return res.status(200).json({ liked, likes: papoRow?.likes ?? 0 });
  } catch (err: any) {
    console.error('like toggle error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
