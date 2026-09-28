// pages/api/papo/[id]/view.ts
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
    const { error } = await supabase.rpc('increment_papo_views', { papo_id: id });
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('view increment error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
