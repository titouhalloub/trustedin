// Creates a Didit session and records its provider session ID before returning the URL.
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) return res.status(404).json({ error: 'Profile not found' });

    const diditApiKey = process.env.DIDIT_API_KEY;
    if (!diditApiKey) {
      console.error('Didit API key is not configured.');
      return res.status(503).json({ error: 'Verification provider is not configured.' });
    }

    const payload = {
      workflow_id: '177924b6-47b3-4744-807e-ea195de3ad3d',
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
      contact_details: { email: user.email },
    };

    const response = await fetch('https://verification.didit.me/v2/session/', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-api-key': diditApiKey,
      },
      body: JSON.stringify(payload),
    });

    const providerResponse = await response.json();
    const sessionUrl = providerResponse.verification_url || providerResponse.url;
    const providerSessionId = providerResponse.session_id || providerResponse.id;

    if (!response.ok || !sessionUrl || !providerSessionId) {
      console.error('Didit session creation failed.');
      return res.status(502).json({ error: 'Could not create a verification session.' });
    }

    // Store the exact provider session association. The document URL is intentionally null:
    // a provider session is not a user-uploaded document.
    const { error: insertError } = await supabase.from('verification_submissions').insert({
      user_id: user.id,
      verification_type: 'didit',
      target_entity_id: null,
      document_url: null,
      status: 'pending',
      provider_session_id: String(providerSessionId),
    });
    if (insertError) {
      console.error('Could not persist Didit session association.');
      return res.status(500).json({ error: 'Could not save verification session.' });
    }

    return res.status(200).json({ session_url: sessionUrl });
  } catch {
    console.error('Didit session handler failed.');
    return res.status(500).json({ error: 'Could not create a verification session.' });
  }
}
