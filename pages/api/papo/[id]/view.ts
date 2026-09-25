import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const supabase = createServerSupabaseClient({ req, res });

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Papo ID is required' });
  }

  try {
    // First, get the current engagement metrics
    const { data: papo, error: fetchError } = await supabase
      .from('papo')
      .select('engagement_metrics')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const currentMetrics = papo.engagement_metrics || { views: 0 };
    const newViews = (currentMetrics.views || 0) + 1;

    // Then, update the engagement_metrics
    const { error: updateError } = await supabase
      .from('papo')
      .update({ engagement_metrics: { ...currentMetrics, views: newViews } })
      .eq('id', id);

    if (updateError) throw updateError;

    return res.status(200).json({ views: newViews });
  } catch (error) {
    console.error('Error tracking view:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
