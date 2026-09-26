// pages/settings/verification/callback.tsx
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

type Status = 'Not Started' | 'In Progress' | 'In Review' | 'Approved' | 'Declined' |
              'Resubmitted' | 'Awaiting User' | 'Abandoned' | 'Expired' | 'Kyc Expired';

export default function VerificationCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    const s = (router.query.status as string) || null;
    const sid = (router.query.verificationSessionId as string) || null;
    setStatus(s as Status | null);
    setSessionId(sid);
  }, [router.isReady, router.query]);

  const { icon, title, description, variant } = getStatusDisplay(status);

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">{icon}</div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionId && (
              <p className="text-xs text-muted-foreground text-center break-all">
                Session: {sessionId}
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <Link href="/settings/verification">
                <Button variant={variant}>Back to Verification</Button>
              </Link>
              <Link href="/feed">
                <Button variant="outline">Go to Feed</Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground text-center pt-2">
              Verification status may take a few moments to sync. Refresh the verification page in ~30 seconds.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function getStatusDisplay(status: Status | null) {
  if (!status) {
    return {
      icon: <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />,
      title: 'Loading...',
      description: 'Please wait while we fetch your verification status.',
      variant: 'default' as const,
    };
  }
  if (status === 'Approved') {
    return {
      icon: <CheckCircle2 className="h-12 w-12 text-green-500" />,
      title: 'Verification Approved',
      description: 'Your identity has been verified. Your profile now shows the verified badge.',
      variant: 'default' as const,
    };
  }
  if (status === 'Declined' || status === 'Expired' || status === 'Kyc Expired' || status === 'Abandoned') {
    return {
      icon: <XCircle className="h-12 w-12 text-red-500" />,
      title: 'Verification Unsuccessful',
      description: 'We could not verify your identity this time. You can try again from the verification page.',
      variant: 'default' as const,
    };
  }
  // Pending states
  return {
    icon: <Clock className="h-12 w-12 text-amber-500" />,
    title: 'Verification In Progress',
    description: `Current status: ${status}. We will notify you once complete.`,
    variant: 'outline' as const,
  };
}
