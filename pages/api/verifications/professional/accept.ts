import { createHash } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const token = typeof (req.method === 'GET' ? req.query.token : req.body?.token) === 'string'
    ? (req.method === 'GET' ? req.query.token : req.body.token).trim()
    : '';

  if (!token || token.length > 256) {
    return res.status(400).json({ error: 'A valid invitation token is required.' });
  }

  try {
    const admin = createSupabaseAdminClient();
    const tokenHash = hashToken(token);
    const { data: invitation, error } = await admin
      .from('professional_verification_invitations')
      .select('id, email, candidate_id, related_entity_id, entity_type, expires_at, accepted_at, declined_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) throw error;
    if (!invitation) return res.status(404).json({ error: 'This invitation link is invalid.' });
    if (invitation.expires_at <= new Date().toISOString()) {
      return res.status(410).json({ error: 'This invitation has expired. Ask the person who invited you to send a new one.' });
    }
    if (invitation.accepted_at || invitation.declined_at) {
      return res.status(409).json({ error: 'This invitation has already been used.' });
    }

    if (req.method === 'GET') {
      const { data: candidate } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', invitation.candidate_id)
        .maybeSingle();

      let claim: Record<string, string | null> | null = null;
      if (invitation.entity_type === 'experience') {
        const { data } = await admin.from('experiences')
          .select('title, company, start_date, end_date, is_current')
          .eq('id', invitation.related_entity_id)
          .eq('user_id', invitation.candidate_id)
          .maybeSingle();
        if (data) {
          claim = {
            type: 'Professional experience',
            title: data.title,
            organization: data.company,
            details: data.start_date
              ? new Date(data.start_date).getFullYear().toString() + ' – ' +
                (data.is_current || !data.end_date ? 'Present' : new Date(data.end_date).getFullYear().toString())
              : null,
          };
        }
      } else {
        const { data } = await admin.from('education')
          .select('school, degree, field_of_study, start_date, end_date')
          .eq('id', invitation.related_entity_id)
          .eq('user_id', invitation.candidate_id)
          .maybeSingle();
        if (data) {
          claim = {
            type: 'Education',
            title: data.degree,
            organization: data.school,
            details: data.field_of_study,
          };
        }
      }

      if (!claim) return res.status(410).json({ error: 'The profile entry for this invitation is no longer available.' });
      return res.status(200).json({
        email: invitation.email,
        candidateName: candidate?.full_name || 'A TrustedIn member',
        claim,
        expiresAt: invitation.expires_at,
      });
    }

    const supabase = createPagesServerClient({ req, res });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Sign in or create a TrustedIn account to respond.' });
    if (!user.email || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(403).json({ error: 'Sign in with the email address this invitation was sent to.' });
    }

    const decision = req.body?.decision;
    if (decision !== 'approve' && decision !== 'decline') {
      return res.status(400).json({ error: 'Choose whether you can verify this claim.' });
    }

    const { data: verificationId, error: resolveError } = await admin.rpc(
      'resolve_professional_verification_invitation',
      {
        p_token_hash: tokenHash,
        p_verifier_id: user.id,
        p_verifier_email: user.email,
        p_decision: decision,
      }
    );

    if (resolveError) {
      const message = resolveError.message || '';
      if (message.includes('INVITATION_EXPIRED')) {
        return res.status(410).json({ error: 'This invitation has expired. Ask the person who invited you to send a new one.' });
      }
      if (message.includes('INVITATION_EMAIL_MISMATCH')) {
        return res.status(403).json({ error: 'Sign in with the email address this invitation was sent to.' });
      }
      if (message.includes('INVITATION_ALREADY_USED')) {
        return res.status(409).json({ error: 'This invitation has already been used.' });
      }
      if (message.includes('INVITATION_NOT_FOUND')) {
        return res.status(404).json({ error: 'This invitation link is invalid.' });
      }
      console.error('Could not resolve professional verification invitation:', resolveError);
      return res.status(500).json({ error: 'Could not process this verification response.' });
    }

    return res.status(200).json({
      message: decision === 'approve'
        ? 'Thank you. Your confirmation has been recorded on TrustedIn.'
        : 'You have declined this verification request.',
      verificationId: verificationId || null,
      decision,
    });
  } catch (error: any) {
    console.error('Professional verification invitation handler failed:', error);
    return res.status(500).json({ error: 'Could not process this invitation.' });
  }
}
