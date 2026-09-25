"use client";

import { Check, Loader2 } from 'lucide-react';
import { useUser } from '@supabase/auth-helpers-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { PublicNavbar } from '@/components/PublicNavbar';
// Temporary flag to switch between Stripe and Wise
const USE_WISE_PAYMENTS = true;

// Data for the plans, structured for easy rendering
const networkingPlans = [
  {
    name: 'Starter',
    price: 'Free',
    priceDetail: '',
    bestFor: 'New users exploring Trustedin',
    features: [
      'Create & verify profile',
      'Limited connections (up to 100)',
      'Basic credibility score',
      'Visibility in searches (limited)',
    ],
    cta: 'Get Started for Free',
    href: '/auth',
    priceId: null, // No price for free plan
    wiseLink: null,
  },
  {
    name: 'Pro / Growth',
    price: '$19',
    priceDetail: '/month',
    bestFor: 'Freelancers & professionals building reach',
    features: [
      'Unlimited connections',
      'Profile analytics (views, trust signals, credibility trends)',
      '10 outreach credits/month',
      'Advanced profile customization',
      'Priority in search results',
    ],
    cta: 'Choose Pro',
    highlight: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID, // Example: Use environment variables
    wiseLink: 'https://wise.com/pay/r/-kVtfGgtpVe_18w', // Temporary Wise link for Pro plan
  },
  {
    name: 'Business',
    price: '$59',
    priceDetail: '/month',
    bestFor: 'Companies & agencies growing brand presence',
    features: [
      'Unlimited connections & outreach',
      'Team/company profiles',
      'Review & endorsement management',
      'Advanced analytics dashboard',
      '50 outreach credits/month',
      'Exportable reports',
    ],
    cta: 'Choose Business',
    priceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID, // Example: Use environment variables
    wiseLink: 'https://wise.com/pay/r/trPru4Eom1g0Am8', // Temporary Wise link for Business plan
  },
];

const recruiterPlans = [
  {
    name: 'Recruiter Starter',
    price: '$69',
    priceDetail: '/month',
    bestFor: 'Individual recruiters or boutique firms',
    features: [
      '1 seat',
      '100 candidate outreach credits/month',
      'Advanced candidate search (filters + Boolean)',
      'Candidate pipeline (up to 5,000 saved profiles)',
      'Basic ATS integration',
      'Analytics dashboard',
      'Monetization via candidate verification: earn per request (limit: 50 verifications/month)',
    ],
    cta: 'Choose Starter',
    priceId: process.env.NEXT_PUBLIC_STRIPE_RECRUITER_STARTER_PRICE_ID, // Example: Use environment variables
    wiseLink: 'https://wise.com/pay/r/l5nyonq1_Lsmfzw',
  },
  {
    name: 'Recruiter Pro',
    price: '$129',
    priceDetail: '/month',
    bestFor: 'Recruiting teams & SMBs hiring at scale',
    features: [
      '3 seats included',
      '200 outreach credits/month',
      'Full advanced search & insights (skills, open-to-work, trust signals)',
      'Unlimited saved projects/candidates',
      'Job slot integration',
      'Team collaboration tools',
      'Priority support',
      'Monetization via candidate verification: higher earning potential (limit: 200 verifications/month)',
    ],
    cta: 'Choose Pro',
    highlight: true,
    priceId: process.env.NEXT_PUBLIC_STRIPE_RECRUITER_PRO_PRICE_ID, // Example: Use environment variables
    wiseLink: 'https://wise.com/pay/r/26oaggZkzT0h4dE',
  },
  {
    name: 'Recruiter Enterprise',
    price: '$499',
    priceDetail: '/month',
    bestFor: 'Enterprises & large recruiting agencies',
    features: [
      '5 seats included (extra seats $150/month)',
      '500+ outreach credits/month',
      'Unlimited candidate pool & pipelines',
      'Enterprise ATS & HR integrations',
      'Advanced analytics & team dashboards',
      'Dedicated account manager',
      'White-label & API access',
      'Monetization via candidate verification: unlimited earning potential (no cap on verifications)',
    ],
    cta: 'Contact Sales',
    priceId: process.env.NEXT_PUBLIC_STRIPE_RECRUITER_ENTERPRISE_PRICE_ID, // Example: Use environment variables
    wiseLink: 'https://wise.com/pay/r/s-AVpYd5iZtR4xI',
  },
];


// A reusable component to render a single plan card
const PlanCard = ({ plan, highlight = false, metadata }: { plan: any, highlight?: boolean, metadata: any }) => {
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const user = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const handleChoosePlan = () => {
    // For paid plans with a Wise link, open it in a new tab
    if (plan.wiseLink && USE_WISE_PAYMENTS) {
      window.open(plan.wiseLink, '_blank', 'noopener,noreferrer');
    } else if (plan.href) { // For the free plan, navigate to the auth page
      window.location.href = plan.href;
    } else {
      console.log("Plan action not configured.");
    }
  };

  const handleStartTrial = async () => {
    if (!user) {
      // If user is not logged in, redirect them to the auth page.
      router.push('/auth');
      return;
    }

    setIsStartingTrial(true);
    const res = await fetch('/api/user/start-trial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan_name: plan.name }),
    });

    if (res.ok) {
      toast({
        title: 'Trial Started!',
        description: `You are now on a trial for the ${plan.name} plan.`,
      });
      // Redirect to a relevant page, like the feed or profile.
      router.push('/feed');
    } else {
      const error = await res.json();
      toast({ title: 'Error Starting Trial', description: error.error || 'An unknown error occurred.', variant: 'destructive' });
    }
    setIsStartingTrial(false);
  };

  return (
    <Card className={cn("flex flex-col", highlight && "border-primary shadow-lg ring-2 ring-primary")}>
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{plan.bestFor}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-baseline">
          <span className="text-4xl font-bold">{plan.price}</span>
          {plan.priceDetail && <span className="text-muted-foreground">{plan.priceDetail}</span>}
        </div>
        <ul className="space-y-2">
          {plan.features.map((feature: string, i: number) => (
            <li key={i} className="flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <div className="w-full space-y-2">
          <Button onClick={handleChoosePlan} className="w-full" variant={highlight ? 'default' : 'outline'}>
            {plan.cta}
          </Button>
          {plan.price !== 'Free' && (
            <Button onClick={handleStartTrial} className="w-full" variant="secondary" disabled={isStartingTrial}>
              {isStartingTrial ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isStartingTrial ? 'Starting...' : 'Start Free Trial'}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};


export default function PricingPage() {
  const user = useUser();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  useEffect(() => {
    // Correctly fetch the 'referral_code' from local storage
    const ref = localStorage.getItem('referral_code');
    if (ref) {
      setReferralCode(ref);
    }
  }, []);

  const metadata = {
    referral_code: referralCode, // Pass the code
    referred_user_id: user?.id,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="text-center py-16 px-6">
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
          Simple, Transparent Pricing — Built for Trust
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Whether you’re growing your personal network, building your brand, or hiring top talent — Trustedin has a plan for you.
        </p>
      </header>

      {/* Networking Plans */}
      <section className="py-12 px-6">
        <h2 className="text-3xl font-bold text-center mb-10">🌱 Networking Plans</h2>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {networkingPlans.map(plan => (
            <PlanCard key={plan.name} plan={plan} highlight={plan.highlight} metadata={metadata} />
          ))}
        </div>
      </section>

      {/* Recruiter Plans */}
      <section className="py-16 px-6 bg-muted">
        <h2 className="text-3xl font-bold text-center mb-10">🧑‍💼 Recruiter Plans</h2>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {recruiterPlans.map(plan => (
            <PlanCard key={plan.name} plan={plan} highlight={plan.highlight} metadata={metadata} />
          ))}
        </div>
      </section>
      
      {/* Comparison Note */}
      <section className="py-12 px-6 text-center">
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            <strong>Note:</strong> Trustedin positions itself as more affordable and authenticity-focused than alternatives, which can cost ~$900–1,200/month per seat.
        </p>
      </section>

      {/* CTA Section */}
      <section className="text-center py-20 px-6 border-t">
        <h2 className="text-3xl font-bold mb-4">Start Free, Upgrade Anytime</h2>
        <p className="text-muted-foreground mb-8">
          Build trust. Grow your network. Hire smarter.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/auth">Get Started for Free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#">Talk to Sales</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}