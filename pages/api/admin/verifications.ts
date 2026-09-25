// pages/api/admin/verifications.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient, SupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Session } from '@supabase/supabase-js';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "";

async function handleGet(req: NextApiRequest, res: NextApiResponse, supabase: SupabaseClient) {
  try {
    const { data: submissions, error: submissionsError } = await supabase
      .from('verification_submissions')
      .select(`
        id,
        created_at,
        verification_type,
        target_entity_id,
        document_url,
        user_id,
        profiles (
          full_name,
          username
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (submissionsError) {
      throw submissionsError;
    }

    return res.status(200).json(submissions);
  } catch (err: any) {
    console.error('API GET /admin/verifications error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, supabase: SupabaseClient) {
  try {
    const { action, submission_id, user_id, notes } = req.body;

    if (!action || !submission_id || !user_id) {
      return res.status(400).json({ error: 'Missing required fields: action, submission_id, user_id' });
    }

    let submissionUpdate: object;
    let profileUpdate: object;
    let responseMessage: string;

    if (action === 'approve') {
      submissionUpdate = { status: 'approved', reviewed_at: new Date().toISOString() };
      profileUpdate = { verification_level: 'verified' };
      responseMessage = 'Verification approved successfully.';
    } else if (action === 'reject') {
      submissionUpdate = { status: 'rejected', reviewed_at: new Date().toISOString(), notes };
      profileUpdate = { verification_level: 'unverified' };
      responseMessage = 'Verification rejected successfully.';
    } else {
      return res.status(400).json({ error: 'Invalid action specified.' });
    }

    const { error: submissionError } = await supabase
      .from('verification_submissions')
      .update(submissionUpdate)
      .eq('id', submission_id);

    if (submissionError) throw submissionError;

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user_id);

    if (profileUpdateError) throw profileUpdateError;

    return res.status(200).json({ message: responseMessage });
  } catch (err: any) {
    console.error('API POST /admin/verifications error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerSupabaseClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const userEmail = session.user.email?.toLowerCase();

  // ✅ Super Admin Bypass — no role check
  if (userEmail !== SUPER_ADMIN_EMAIL.toLowerCase()) {
    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || adminProfile?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin role required.' });
    }
  }

  if (req.method === 'GET') {
    return handleGet(req, res, supabase);
  }

  if (req.method === 'POST') {
    return handlePost(req, res, supabase);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
