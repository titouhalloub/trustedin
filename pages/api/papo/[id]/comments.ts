// pages/api/papo/[id]/comments.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Papo ID is required' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });

    const { data, error } = await supabase
      .from('papo_comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        author:profiles!papo_comments_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('papo_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('API GET /papo/[id]/comments error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data || []);
  } catch (err: any) {
    console.error('API GET /papo/[id]/comments error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

