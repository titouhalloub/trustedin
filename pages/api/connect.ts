import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  message: string;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | ErrorResponse>
) {
  const supabase = createPagesServerClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { targetUserId } = req.body;
  const currentUserId = session.user.id;

  if (!targetUserId || typeof targetUserId !== 'string') {
    return res.status(400).json({ error: 'targetUserId is required' });
  }

  if (req.method === 'POST') {
    // Follow a user
    const { error } = await supabase.from('connections').insert({
      follower_id: currentUserId,
      following_id: targetUserId,
    });

    if (error) {
      console.error('Error following user:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Successfully followed user.' });
  } else if (req.method === 'DELETE') {
    // Unfollow a user
    const { error } = await supabase.from('connections').delete().eq('follower_id', currentUserId).eq('following_id', targetUserId);

    if (error) {
      console.error('Error unfollowing user:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Successfully unfollowed user.' });
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}