// pages/api/verifications/didit-session.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch profile for metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio')
      .eq('id', user.id)
      .single();

    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const diditApiKey = process.env.DIDIT_API_KEY;
    if (!diditApiKey) throw new Error('Didit API key not configured');

    // Build payload
    const payload = {
      workflow_id: "177924b6-47b3-4744-807e-ea195de3ad3d",
      vendor_data: profile.id,
      callback: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/verification/callback`,
      metadata: JSON.stringify({
        user_id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
      }),
      language: 'en',
      contact_details: {
        email: user.email,
      },
    };

    console.log('Creating Didit session with payload:', payload);

    const response = await fetch('https://verification.didit.me/v2/session/', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': diditApiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log('Didit raw response:', data);

    const sessionUrl = data.verification_url || data.url;
    if (!response.ok || !sessionUrl) {
      console.error('Failed to create Didit session:', data);
      throw new Error(data.message || 'Failed to create Didit session');
    }

    return res.status(200).json({ session_url: sessionUrl });

  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Didit session handler error:', message);
    return res.status(500).json({ error: `Failed to create Didit session: ${message}` });
  }
}
