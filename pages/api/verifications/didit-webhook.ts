import type { NextApiRequest, NextApiResponse } from 'next';
import { createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

function header(req: NextApiRequest, name: string): string | null {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj).sort().reduce<Record<string, unknown>>((result, key) => {
      result[key] = canonicalize(obj[key]);
      return result;
    }, {});
  }
  // JSON.parse already normalizes whole-valued numbers (e.g. 1.0 to 1).
  return value;
}

function verifySignature(body: unknown, signature: string, timestamp: string, secret: string): boolean {
  const parsedTimestamp = Number(timestamp);
  if (!Number.isFinite(parsedTimestamp) || Math.abs(Math.floor(Date.now() / 1000) - parsedTimestamp) > 300) {
    return false;
  }
  const canonical = JSON.stringify(canonicalize(body));
  const expected = createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
  const actualBuffer = Buffer.from(signature.trim().toLowerCase(), 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

const statusMap: Record<string, string> = {
  'Approved': 'approved',
  'Declined': 'declined',
  'In Review': 'pending',
  'Not Started': 'pending',
  'Resubmitted': 'pending',
  'Abandoned': 'abandoned',
  'Kyc Expired': 'expired',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const secret = process.env.DIDIT_WEBHOOK_SECRET;
  if (!secret) {
    console.error('DIDIT_WEBHOOK_SECRET is not configured.');
    return res.status(503).json({ error: 'Webhook is not configured.' });
  }

  let event: any;
  try {
    const rawBody = await readRawBody(req);
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  const signature = header(req, 'x-signature-v2');
  const timestamp = header(req, 'x-timestamp');
  if (!signature || !timestamp || !verifySignature(event, signature, timestamp, secret)) {
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }

  if (!['status.updated', 'data.updated'].includes(event.webhook_type)) {
    return res.status(200).json({ received: true, ignored: true });
  }

  const userId = typeof event.vendor_data === 'string' ? event.vendor_data : '';
  const sessionId = typeof event.session_id === 'string' ? event.session_id : '';
  const eventId = typeof event.event_id === 'string' ? event.event_id : '';
  const status = typeof event.status === 'string' ? statusMap[event.status] : undefined;

  if (!userId || !sessionId || !eventId || !status) {
    return res.status(400).json({ error: 'Missing or unsupported verification event fields.' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase service configuration is missing for Didit webhook.');
    return res.status(503).json({ error: 'Webhook is not configured.' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: duplicate } = await supabase.from('didit_webhook_events')
      .select('event_id').eq('event_id', eventId).maybeSingle();
    if (duplicate) return res.status(200).json({ received: true, duplicate: true });

    const { data: submission, error: submissionError } = await supabase
      .from('verification_submissions')
      .select('id, user_id, created_at')
      .eq('provider_session_id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (submissionError) throw submissionError;
    // Unknown sessions are never attached to the latest submission for a user.
    if (!submission) {
      console.warn('Didit event ignored because no matching stored session exists.');
      return res.status(200).json({ received: true, ignored: true });
    }

    const { error: updateError } = await supabase.from('verification_submissions')
      .update({
        status,
        provider_event_id: eventId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submission.id);
    if (updateError) throw updateError;

    // Only the user's latest Didit session controls the summary profile flag.
    const { data: latest } = await supabase.from('verification_submissions')
      .select('id').eq('user_id', userId).eq('verification_type', 'didit')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (latest?.id === submission.id) {
      const verificationLevel = status === 'approved' ? 'verified' : 'pending';
      const { error: profileError } = await supabase.from('profiles')
        .update({ verification_level: verificationLevel }).eq('id', userId);
      if (profileError) throw profileError;
    }

    const { error: eventInsertError } = await supabase.from('didit_webhook_events')
      .insert({ event_id: eventId, session_id: sessionId });
    if (eventInsertError && eventInsertError.code !== '23505') throw eventInsertError;

    return res.status(200).json({ received: true });
  } catch {
    console.error('Didit webhook processing failed.');
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
}
