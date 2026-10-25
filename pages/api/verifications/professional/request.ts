import { createHash, randomBytes } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    };
    return entities[char];
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.TRUSTEDIN_FROM_EMAIL;
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    ''
  ).replace(/\/+$/, '');

  if (!resendApiKey || !fromEmail || !baseUrl) {
    return res.status(503).json({
      error: 'Professional invitation email is not configured yet. Please contact the TrustedIn administrator.',
    });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { user: candidate }, error: authError } = await supabase.auth.getUser();

    if (authError || !candidate) {
      return res.status(401).json({ error: 'You must be logged in to request a verification.' });
    }

    const email = typeof req.body?.verifier_email === 'string'
      ? req.body.verifier_email.trim().toLowerCase()
      : '';
    const relatedEntityId = typeof req.body?.related_entity_id === 'string'
      ? req.body.related_entity_id.trim()
      : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !relatedEntityId) {
      return res.status(400).json({ error: 'Enter a valid professional email address.' });
    }

    if (candidate.email && candidate.email.toLowerCase() === email) {
      return res.status(400).json({ error: 'You cannot verify your own experience.' });
    }

    const admin = createSupabaseAdminClient();
    let entityType: 'experience' | 'education';
    let claimTitle = '';
    let claimOrganization = '';
    let claimDetails = '';

    const { data: experience } = await admin
      .from('experiences')
      .select('id, title, company, start_date, end_date, is_current')
      .eq('id', relatedEntityId)
      .eq('user_id', candidate.id)
      .maybeSingle();

    if (experience) {
      entityType = 'experience';
      claimTitle = experience.title;
      claimOrganization = experience.company;
      claimDetails = experience.start_date
        ? new Date(experience.start_date).getFullYear().toString() + ' – ' +
          (experience.is_current || !experience.end_date ? 'Present' : new Date(experience.end_date).getFullYear().toString())
        : '';
    } else {
      const { data: education } = await admin
        .from('education')
        .select('id, school, degree, field_of_study, start_date, end_date')
        .eq('id', relatedEntityId)
        .eq('user_id', candidate.id)
        .maybeSingle();

      if (!education) {
        return res.status(404).json({ error: 'The experience or education entry could not be found on your profile.' });
      }

      entityType = 'education';
      claimTitle = education.degree;
      claimOrganization = education.school;
      claimDetails = education.field_of_study || '';
    }

    const { count, error: rateLimitError } = await admin
      .from('professional_verification_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('candidate_id', candidate.id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (rateLimitError) throw rateLimitError;
    if ((count || 0) >= 10) {
      return res.status(429).json({ error: 'You have reached the hourly invitation limit. Please try again later.' });
    }

    const { data: duplicate } = await admin
      .from('professional_verification_invitations')
      .select('id')
      .eq('candidate_id', candidate.id)
      .eq('related_entity_id', relatedEntityId)
      .eq('email', email)
      .is('accepted_at', null)
      .is('declined_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (duplicate) {
      return res.status(409).json({ error: 'An invitation for this email and profile entry is already pending.' });
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { data: candidateProfile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', candidate.id)
      .maybeSingle();

    const { data: invitation, error: insertError } = await admin
      .from('professional_verification_invitations')
      .insert({
        candidate_id: candidate.id,
        email,
        related_entity_id: relatedEntityId,
        entity_type: entityType,
        token_hash: tokenHash,
      })
      .select('id')
      .single();

    if (insertError || !invitation) throw insertError || new Error('Could not create the invitation.');

    const inviteUrl = baseUrl + '/professional-verification/accept?token=' + encodeURIComponent(token);
    const candidateName = candidateProfile?.full_name || 'A TrustedIn member';
    const safeCandidateName = escapeHtml(candidateName);
    const safeTitle = escapeHtml(claimTitle || 'Professional profile entry');
    const safeOrganization = escapeHtml(claimOrganization);
    const safeDetails = escapeHtml(claimDetails);
    const claimLine = safeTitle + (safeOrganization ? ' at ' + safeOrganization : '') +
      (safeDetails ? ' (' + safeDetails + ')' : '');

    const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#172033;line-height:1.6">' +
      '<h1 style="font-size:24px">Help verify a professional claim on TrustedIn</h1>' +
      '<p>' + safeCandidateName + ' has asked you to verify this profile entry:</p>' +
      '<p style="padding:16px;background:#f5f7fb;border-radius:8px"><strong>' + claimLine + '</strong></p>' +
      '<p>TrustedIn helps professionals build credible, evidence-backed profiles. Review the details and confirm only if you can genuinely verify this experience or education.</p>' +
      '<p><a href="' + inviteUrl + '" style="display:inline-block;padding:12px 20px;background:#2457d6;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">Review verification request</a></p>' +
      '<p>If you do not have a TrustedIn account, you can create one through this link and then respond to the request. Opening the link does not verify the claim by itself.</p>' +
      '<p style="font-size:12px;color:#667085">This invitation expires in 7 days. If you were not expecting it, you can ignore this email.</p>' +
      '<p>— The TrustedIn team</p></div>';
    const textBody = candidateName + ' has asked you to verify: ' + claimLine + '\n\n' +
      'Review the request and confirm only if you can genuinely verify this experience or education: ' + inviteUrl + '\n\n' +
      'You can create a TrustedIn account through this link. Opening it does not verify the claim by itself. The invitation expires in 7 days.';

    let emailResponse: Response | null = null;
    let emailDeliveryError = '';

    try {
      emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + resendApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: candidateName + ' invited you to verify a professional claim on TrustedIn',
          html,
          text: textBody,
        }),
      });
    } catch (error) {
      emailDeliveryError = error instanceof Error ? error.message : 'Unknown email provider error';
    }

    if (!emailResponse || !emailResponse.ok) {
      const providerError = emailResponse ? await emailResponse.text() : emailDeliveryError;
      console.error('Resend failed to send professional verification invitation:', providerError);

      // Keep the invitation alive so the candidate can share the secure link manually.
      // The token is only returned to the authenticated candidate; the database stores its hash.
      return res.status(201).json({
        message: 'Invitation link created, but email delivery failed.',
        email,
        emailSent: false,
        inviteUrl,
      });
    }

    return res.status(201).json({
      message: 'Invitation email sent.',
      email,
      emailSent: true,
    });
  } catch (error: any) {
    console.error('Error creating professional verification invitation:', error);
    return res.status(500).json({ error: 'Could not send the professional verification invitation.' });
  }
}
