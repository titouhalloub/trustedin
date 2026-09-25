import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  conversation_id: number;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | ErrorResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const supabase = createPagesServerClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { recipientId } = req.body;
  const currentUserId = session.user.id;

  if (!recipientId || typeof recipientId !== 'string') {
    return res.status(400).json({ error: 'recipientId is required' });
  }

  if (recipientId === currentUserId) {
    return res.status(400).json({ error: 'Cannot start a conversation with yourself.' });
  }

  try {
    const { data, error } = await supabase.rpc('find_or_create_conversation', {
      user_1_id: currentUserId,
      user_2_id: recipientId,
    });

    if (error) throw error;

    res.status(200).json({ conversation_id: data });
  } catch (error: any) {
    console.error('Error finding or creating conversation:', error);
    res.status(500).json({ error: error.message });
  }
}