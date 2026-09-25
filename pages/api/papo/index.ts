import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerSupabaseClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  switch (req.method) {
    case 'POST': {
      // Create a new Papo
      const { title, prompt_used, ai_generated_content, slug } = req.body;
      const { data, error } = await supabase
        .from('papo')
        .insert([
          {
            user_id: session.user.id,
            title,
            prompt_used,
            ai_generated_content,
            slug,
          },
        ])
        .select();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(data);
    }
    case 'GET': {
        // For now, just get all papos. We can add pagination later.
        const { data, error } = await supabase.from('papo').select('*, author:profiles(username)');

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json(data);
    }
    default:
      res.setHeader('Allow', ['POST', 'GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
