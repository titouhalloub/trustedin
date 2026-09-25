import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerSupabaseClient({ req, res });
  const { id } = req.query;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  switch (req.method) {
    case 'GET': {
      const { data, error } = await supabase
        .from('papo')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      if (!data) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(data);
    }
    case 'PUT': {
      const { title, edited_content, slug } = req.body;
      const { data, error } = await supabase
        .from('papo')
        .update({
          title,
          edited_content,
          slug,
        })
        .eq('id', id)
        .eq('user_id', session.user.id); // Ensure only the owner can update

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data);
    }
    case 'DELETE': {
      const { data, error } = await supabase
        .from('papo')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id); // Ensure only the owner can delete

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(204).end();
    }
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
