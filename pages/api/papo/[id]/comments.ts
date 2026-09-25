import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const supabase = createServerSupabaseClient({ req, res });

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Papo ID is required' });
  }

  try {
    const { data, error } = await supabase
      .from('post_comments')
      .select('*, author:profiles(*)')
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
