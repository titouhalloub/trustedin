import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { user: candidate } } = await supabase.auth.getUser();

    if (!candidate) {
      return res.status(401).json({ error: 'Unauthorized. You must be logged in to request a verification.' });
    }

    const { verifier_email, related_entity_id } = req.body;

    if (!verifier_email || !related_entity_id) {
      return res.status(400).json({ error: 'Verifier email and related entity ID are required.' });
    }

    // 1. Find the profile of the user being asked to verify.
    const { data: verifierProfile, error: verifierError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', verifier_email)
      .single();

    if (verifierError || !verifierProfile) {
      return res.status(404).json({ error: `No user found with the email "${verifier_email}". Please ensure they have a Trustedin account.` });
    }

    // Prevent users from verifying their own experience.
    if (verifierProfile.id === candidate.id) {
      return res.status(400).json({ error: 'You cannot request a verification from yourself.' });
    }

    // 2. Create the verification request record.
    const { data, error: insertError } = await supabase
      .from('professional_verifications')
      .insert({
        candidate_id: candidate.id,
        verifier_id: verifierProfile.id,
        related_entity_id: related_entity_id,
        status: 'pending',
      });

    if (insertError) throw insertError;

    return res.status(201).json({ message: 'Verification request created successfully.' });
  } catch (error: any) {
    console.error('Error creating professional verification request:', error);
    // Handle potential unique constraint violation (duplicate request)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A pending verification request for this experience already exists for this verifier.' });
    }
    return res.status(500).json({ error: error.message || 'An internal server error occurred.' });
  }
}
