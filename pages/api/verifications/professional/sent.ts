// pages/api/verifications/professional/sent.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // FK hint required: two FKs point to profiles (verifier_id and candidate_id).
    // Without the hint, PostgREST returns PGRST201 (ambiguous embed).
    const { data, error } = await supabase
      .from('professional_verifications')
      .select(`
        id,
        created_at,
        status,
        verifier:profiles!professional_verifications_verifier_id_fkey(
          id, full_name, username, avatar_url
        )
      `)
      .eq('candidate_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('API GET /verifications/professional/sent error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Frontend expects a bare array, not a wrapped object.
    return res.status(200).json(data || []);
  } catch (err: any) {
    console.error('API GET /verifications/professional/sent error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
