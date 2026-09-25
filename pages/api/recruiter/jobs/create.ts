import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { title, description, location } = req.body;

    const supabase = createServerSupabaseClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert([
        {
          title,
          description,
          location,
          recruiter_id: session.user.id,
        },
      ]);

    if (error) {
      console.error('Error creating job:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.status(201).json(data);
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
};

export default handler;
