import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Job } from '@/lib/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Job[] | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = createServerSupabaseClient({ req, res });

  try {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*, profiles!inner(full_name), job_applications(candidate_id)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json(jobs || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}