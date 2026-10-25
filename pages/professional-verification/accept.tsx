import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, ShieldQuestion } from 'lucide-react';

type Invitation = {
  email: string;
  candidateName: string;
  claim: { type: string | null; title: string | null; organization: string | null; details: string | null };
  expiresAt: string;
};

export default function AcceptProfessionalVerificationPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  const token = typeof router.query.token === 'string' ? router.query.token : '';
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [password, setPassword] = useState('');
  const [loadingInvitation, setLoadingInvitation] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [completed, setCompleted] = useState<'approve' | 'decline' | null>(null);

  useEffect(() => {
    if (!router.isReady || !token) return;
    let cancelled = false;
    setLoadingInvitation(true);
    fetch('/api/verifications/professional/accept?token=' + encodeURIComponent(token))
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'This invitation could not be loaded.');
        return data as Invitation;
      })
      .then((data) => { if (!cancelled) setInvitation(data); })
      .catch((error: Error) => { if (!cancelled) setPageError(error.message); })
      .finally(() => { if (!cancelled) setLoadingInvitation(false); });
    return () => { cancelled = true; };
  }, [router.isReady, token]);

  const authenticate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invitation || !token) return;
    setAuthLoading(true);
    setPageError('');
    setNotice('');
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password,
        });
        if (error) throw error;
      } else {
        const redirectUrl = window.location.origin + '/professional-verification/accept?token=' + encodeURIComponent(token);
        const { data, error } = await supabase.auth.signUp({
          email: invitation.email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice('Check your email to confirm your TrustedIn account. After confirming, you will return here to respond to the verification request.');
        }
      }
    } catch (error: any) {
      setPageError(error.message || 'Could not authenticate.');
    } finally {
      setAuthLoading(false);
    }
  };

  const respond = useCallback(async (decision: 'approve' | 'decline') => {
    if (!token) return;
    setDecisionLoading(true);
    setPageError('');
    try {
      const response = await fetch('/api/verifications/professional/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit your response.');
      setCompleted(decision);
      setNotice(data.message);
    } catch (error: any) {
      setPageError(error.message || 'Could not submit your response.');
    } finally {
      setDecisionLoading(false);
    }
  }, [token]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setPageError('');
    setNotice('');
  };

  if (loadingInvitation) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const signedInEmail = user?.email?.toLowerCase() || '';
  const invitationEmail = invitation?.email?.toLowerCase() || '';
  const emailMatches = !!signedInEmail && signedInEmail === invitationEmail;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-xl">
        <a href="/" className="mb-6 block text-center text-3xl font-extrabold text-blue-600">TrustedIn</a>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
              Professional verification request
            </CardTitle>
            <CardDescription>
              Review the claim below. Creating an account or opening this link does not verify the claim; you must explicitly confirm it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {pageError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{pageError}</p>}
            {notice && <p role="status" className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">{notice}</p>}
            {!invitation && !pageError ? null : invitation && (
              <>
                <div className="rounded-lg border bg-white p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">{invitation.candidateName} asks you to verify:</p>
                  <p className="font-semibold">{invitation.claim.title || 'Professional profile entry'}</p>
                  {invitation.claim.organization && <p>{invitation.claim.organization}</p>}
                  {invitation.claim.details && <p className="text-sm text-muted-foreground">{invitation.claim.details}</p>}
                  <p className="text-xs text-muted-foreground">Invitation sent to {invitation.email}</p>
                </div>

                {completed ? (
                  <div className="space-y-3 text-center py-3">
                    <ShieldCheck className="mx-auto h-10 w-10 text-green-600" />
                    <p className="font-semibold">{completed === 'approve' ? 'Verification confirmed' : 'Request declined'}</p>
                    <p className="text-sm text-muted-foreground">Thank you for helping make professional claims more trustworthy.</p>
                    <Button className="w-full" onClick={() => router.push('/')}>Continue to TrustedIn</Button>
                  </div>
                ) : emailMatches ? (
                  <div className="space-y-3">
                    <p className="text-sm">Signed in as <strong>{user?.email}</strong></p>
                    <Button className="w-full" disabled={decisionLoading} onClick={() => respond('approve')}>
                      {decisionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                      I confirm this claim
                    </Button>
                    <Button className="w-full" variant="outline" disabled={decisionLoading} onClick={() => respond('decline')}>
                      <ShieldQuestion className="mr-2 h-4 w-4" /> I can't verify this claim
                    </Button>
                    <Button className="w-full" variant="ghost" onClick={signOut}>Use a different account</Button>
                  </div>
                ) : user ? (
                  <div className="space-y-3">
                    <p className="text-sm">This invitation was sent to <strong>{invitation.email}</strong>, but you are signed in as <strong>{user.email}</strong>.</p>
                    <Button className="w-full" onClick={signOut}>Sign out and continue with the invited email</Button>
                  </div>
                ) : (
                  <form onSubmit={authenticate} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email address</Label>
                      <Input value={invitation.email} readOnly type="email" />
                      <p className="text-xs text-muted-foreground">For security, you must use the email address that received this invitation.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} />
                    </div>
                    <Button className="w-full" type="submit" disabled={authLoading}>
                      {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {authMode === 'signup' ? 'Create TrustedIn account' : 'Sign in and verify'}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      {authMode === 'signup' ? 'Already have a TrustedIn account?' : 'New to TrustedIn?'}{' '}
                      <button type="button" className="font-medium text-blue-600 underline" onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setPageError(''); setNotice(''); }}>
                        {authMode === 'signup' ? 'Sign in' : 'Create an account'}
                      </button>
                    </p>
                  </form>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
