import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

const CREDIT_REWARD_FOR_VERIFICATION = 5;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = createPagesServerClient({ req, res });
  const { data: { session }, } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { action, target_user_id, verification_id } = req.body;

  try {
    if (action === 'spend_outreach') {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile) {
        return res.status(404).json({ error: 'Profile not found.' });
      }

      if (profile.credits <= 0) {
        return res.status(403).json({ error: 'Insufficient credits.' });
      }

      // Spend 1 credit by calling the atomic RPC function
      const { data, error } = await supabase.rpc('handle_credit_transaction', {
        p_user_id: session.user.id,
        p_amount: -1,
        p_reason: 'premium_feature',
      });

      if (error) throw error;

      return res.status(200).json({ success: true, new_balance: data });
    }

    if (action === 'earn_verification') {
      // The user performing the verification (the one logged in) gets the reward.
      const verifierId = session.user.id;

      // In a real app, you might add checks here to see if the verifier is a recruiter
      // and if they are under their monthly verification earning cap.

      const { data, error } = await supabase.rpc('handle_credit_transaction', {
        p_user_id: verifierId,
        p_amount: CREDIT_REWARD_FOR_VERIFICATION,
        p_reason: 'verification_reward',
      });

      if (error) throw error;

      return res.status(200).json({ success: true, new_balance: data });
    }

    return res.status(400).json({ error: 'Invalid action specified.' });

  } catch (error: any) {
    console.error('Credit transaction failed:', error);
    return res.status(500).json({ error: error.message || 'An internal server error occurred.' });
  }
}