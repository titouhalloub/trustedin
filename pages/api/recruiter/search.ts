import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { keywords, skills, location } = req.query;

    const supabase = createServerSupabaseClient({ req, res });

    let query = supabase.from('profiles').select('*');

    if (keywords) {
      query = query.or(`full_name.ilike.%${keywords}%,username.ilike.%${keywords}%,bio.ilike.%${keywords}%`);
    }

    if (skills) {
      const skillsArray = (skills as string).split(',').map(skill => skill.trim());
      query = query.contains('skills', skillsArray);
    }

    if (location) {
      // Assuming location is stored in a text field
      query = query.ilike('location', `%${location}%`);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error('Error searching profiles:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.status(200).json(data);
  } else {
    res.setHeader('Allow', 'GET');
    res.status(405).end('Method Not Allowed');
  }
};

export default handler;
