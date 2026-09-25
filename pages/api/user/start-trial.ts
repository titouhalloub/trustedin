import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = createServerSupabaseClient({ req, res });

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { plan_name } = req.body;

  if (!plan_name) {
    return res.status(400).json({ error: 'Plan name is required.' });
  }

  try {
    // Call the database function as the authenticated user.
    // This assumes you have already created the 'start_user_trial' RPC function.
    const { error: rpcError } = await supabase
      .rpc('start_user_trial', { plan_name });

    if (rpcError) {
      // Forward the database error to the client.
      return res.status(400).json({ error: rpcError.message });
    }

    return res.status(200).json({ message: 'Trial started successfully!' });

  } catch (error: any) {
    console.error('Error starting user trial:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}