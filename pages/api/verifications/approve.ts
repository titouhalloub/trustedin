import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Check if user is an admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Not an admin' });
  }

  const { submission_id, user_id } = req.body;

  if (!submission_id || !user_id) {
    return res.status(400).json({ error: 'Missing submission_id or user_id' });
  }

  try {
    // Note: In a production app, these two operations should be in a database transaction
    // using a PostgreSQL function to ensure data consistency.

    // 1. Update the submission status to 'approved'
    const { error: submissionError } = await supabase
      .from('verification_submissions')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', submission_id);

    if (submissionError) throw submissionError;

    // 2. Update the user's profile to 'verified'
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ verification_level: 'verified' })
      .eq('id', user_id);

    if (profileUpdateError) throw profileUpdateError;

    return res.status(200).json({ message: 'Verification approved successfully.' });

  } catch (err: any) {
    console.error('Error approving verification:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}