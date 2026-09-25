import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-08-27.basil' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Admin client to bypass RLS for internal updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = { api: { bodyParser: false } };

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature']!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      // Logic to create a new subscription in your `subscriptions` table
      console.log(`Checkout session completed for ${session.customer_email}`);
      // Example: await createSubscription(session);
      break;
    
    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice;
      // Logic to update subscription status and `current_period_end`
      console.log(`Invoice payment succeeded for ${invoice.customer_email}`);
      // Example: await renewSubscription(invoice);
      break;

    // ... handle other event types (e.g., `invoice.payment_failed`)

    default:
      console.warn(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

export default handler;