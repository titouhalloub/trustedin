// pages/api/verifications/submit.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { verification_type, document_url, target_entity_id } = req.body;

    if (!verification_type || !document_url) {
      return res.status(400).json({ error: 'Missing required fields: verification_type and document_url' });
    }

    // Fetch the user's current profile to check verification_level
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('verification_level')
      .eq('id', session.user.id)
      .single();

    if (profileError) throw profileError;

    // 1. Create a record in the verification_submissions table
    const { data: submission, error: submissionError } = await supabase
      .from('verification_submissions')
      .insert({
        user_id: session.user.id,
        verification_type,
        document_url,
        status: 'pending',
        target_entity_id,
      })
      .select()
      .single();

    if (submissionError) throw submissionError;

    // 2. Conditionally update the user's profile status to 'pending'
    //    Only update if they are not already verified.
    if (profile?.verification_level !== 'verified') {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ verification_level: 'pending' })
        .eq('id', session.user.id);

      if (profileUpdateError) throw profileUpdateError;
    }

    return res.status(200).json({ message: 'Submission successful', submission });
  } catch (err: any) {
    console.error('API /verifications/submit error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}