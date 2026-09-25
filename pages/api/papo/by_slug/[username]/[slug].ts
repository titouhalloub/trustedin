// pages/api/papo/by_slug/[username]/[slug].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerSupabaseClient({ req, res });
  const { username, slug } = req.query;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // I'm assuming a 'profiles' table exists that links users and usernames
  const { data, error } = await supabase
    .from('papo')
    .select(`
      *,
      profiles (
        username
      )
    `)
    .eq('slug', slug)
    .eq('profiles.username', username)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'Not found' });
  }

  return res.status(200).json(data);
}
