import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';

import { supabaseAdmin } from '@/lib/supabaseClient';

// Stripe requires the raw body to construct the event.
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method === 'POST') {
    const buf = await buffer(req);
    const stripeSignature = req.headers['stripe-signature'] as string;

    try {
      // Verify the webhook signature
      const event = stripe.webhooks.constructEvent(
        buf,
        stripeSignature,
        webhookSecret
      );

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;

          // Extract referral code and the new subscriber's ID from metadata
          const referralCodeUsed = session.metadata?.referral_code;
          const referredUserId = session.metadata?.referred_user_id;
          const stripeSubscriptionId = session.subscription;

          if (referralCodeUsed && referredUserId && stripeSubscriptionId) {
            // Find the referral record that was created by the database trigger on signup.
            const { data: referral, error: findReferralError } = await supabaseAdmin
              .from('referrals')
              .select('id')
              .eq('referred_user_id', referredUserId)
              .eq('referral_code_used', referralCodeUsed)
              .single();

            if (findReferralError) {
              console.error('Stripe Webhook: Could not find matching referral record.', findReferralError);
              break; // Stop processing if we can't attribute the commission
            }

            if (referral) {
              // Now that we have the referral record, update it with the subscription info.
              const { error: updateError } = await supabaseAdmin
                .from('referrals')
                .update({
                  stripe_subscription_id: stripeSubscriptionId,
                  commission_status: 'unpaid', // Mark as ready for payout
                })
                .eq('id', referral.id);

              if (updateError) {
                console.error('Stripe Webhook: Failed to update referral record with subscription ID.', updateError);
              } else {
                console.log(`Commission recorded for new subscriber ${referredUserId} who used code ${referralCodeUsed}`);
              }
            }
          }

          break;
        }
        // Add more event handlers here as needed (e.g., invoice.paid for recurring payments)
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}

/*
This Stripe webhook endpoint is designed to listen for checkout.session.completed events and then record commissions.

Key improvements and explanations:

    Security:
        Webhook Signature Verification: This is crucial. It ensures that the event is genuinely from Stripe and not a malicious actor.  The STRIPE_WEBHOOK_SECRET should be stored securely and not exposed in client-side code.
    Stripe Library:
        Using the Stripe Library: The code uses the official Stripe Node.js library, which simplifies many operations and handles complexities like signature verification.
    Error Handling:
        Comprehensive Error Handling: The code includes try...catch blocks to handle potential errors during event processing and signature verification.  It returns appropriate HTTP status codes to Stripe to indicate success or failure.
    Asynchronous Operations:
        Asynchronous Operations: The handler function is async to properly handle asynchronous operations like database updates.
*/