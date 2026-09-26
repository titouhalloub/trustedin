// pages/api/verifications/didit-webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // use service role for server-side updates
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).end('Method Not Allowed');
    }

    const event = req.body;

    // Debug log
    console.log('Didit webhook event:', event);

    // vendor_data should contain your internal user id
    const userId = event.vendor_data;
    if (!userId) {
      console.error('Webhook missing vendor_data (user id)');
      return res.status(400).json({ error: 'Missing vendor_data' });
    }

    // Map Didit status to internal status
    const statusMap: Record<string, string> = {
      'Approved': 'approved',
      'Declined': 'declined',
      'In Review': 'pending',
      'Not Started': 'pending',
    };
    const verificationStatus = statusMap[event.status] || 'pending';

    // Update or create a verification submission record
    const { data: existingSubmission } = await supabase
      .from('verification_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingSubmission) {
      await supabase
        .from('verification_submissions')
        .update({
          status: verificationStatus,
          notes: event.notes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', existingSubmission.id);
    } else {
      await supabase.from('verification_submissions').insert({
        user_id: userId,
        verification_type: 'didit',
        target_entity_id: null,
        document_url: event.document_url || null,
        status: verificationStatus,
        notes: event.notes || null,
        created_at: new Date().toISOString(),
      });
    }

    // Update user verification_level if approved
    if (verificationStatus === 'approved') {
      await supabase
        .from('profiles')
        .update({ verification_level: 'verified' })
        .eq('id', userId);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Didit webhook error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
