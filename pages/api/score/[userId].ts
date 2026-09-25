import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { userId } = req.query;

  if (typeof userId !== 'string') {
    return res.status(400).json({ error: 'A valid userId is required.' });
  }

  const supabase = createPagesServerClient({ req, res });

  // Fetch profile to get current score and badge
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('trust_score, badge_level')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Fetch score history, including the new_score field
  const { data: history, error: historyError } = await supabase
    .from('score_history')
    .select('delta, reason, created_at, new_score')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  res.status(200).json({
    userId,
    score: profile.trust_score,
    badge: profile.badge_level,
    history: history || [],
  });
}