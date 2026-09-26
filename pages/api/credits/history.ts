// pages/api/credits/history.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Current balance from profiles.credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('API GET /credits/history profile error:', profileError);
      return res.status(500).json({ error: profileError.message });
    }

    // Transaction history
    const { data: history, error: historyError } = await supabase
      .from('credit_transactions')
      .select('id, amount, reason, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (historyError) {
      console.error('API GET /credits/history tx error:', historyError);
      return res.status(500).json({ error: historyError.message });
    }

    return res.status(200).json({
      current_balance: profile?.credits ?? 0,
      history: history || [],
    });
  } catch (err: any) {
    console.error('API GET /credits/history error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
