import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const supabase = createServerSupabaseClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const { content } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Papo ID is required' });
  }

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const { data, error } = await supabase
      .from('post_comments')
      .insert([
        {
          post_id: id,
          user_id: session.user.id,
          content,
        },
      ])
      .select();

    if (error) throw error;

    return res.status(201).json(data);
  } catch (error) {
    console.error('Error adding comment:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
