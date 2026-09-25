import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReloadIcon } from '@radix-ui/react-icons';
import { Eye, EyeOff, Linkedin } from "lucide-react";

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = useSupabaseClient();

  useEffect(() => {
    // Capture referral code from URL (e.g., /auth?ref=xyz) and store it in localStorage.
    if (router.query.ref && typeof router.query.ref === 'string') {
      localStorage.setItem('referral_code', router.query.ref);
      console.log(`Referral code captured: ${router.query.ref}`);
    }
  }, [router.query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
      } else {
        // ✅ Confirm password match
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }
 
        // ✅ Signup
        const referralCode = localStorage.getItem('referral_code');
        const signUpOptions: {
          emailRedirectTo: string;
          data?: { [key: string]: any };
        } = {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/`,
        };

        if (referralCode) {
          signUpOptions.data = { referral_code: referralCode };
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: signUpOptions,
        });
 
        if (signUpError) throw signUpError;
 
        // This case handles when the user exists but is not confirmed.
        // Supabase returns a user object with an empty identities array.
        if (signUpData.user && signUpData.user.identities?.length === 0) {
          setMessage("This user already exists but is not confirmed. We've re-sent the confirmation email. Please check your inbox.");
          // Clear the referral code as the user already exists.
          localStorage.removeItem('referral_code');
        } else {
          setMessage("Confirmation email sent! Please check your inbox.");
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }

    setLoading(false);
  };

  const handleLinkedInSignIn = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        scopes: 'openid profile email w_member_social',
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/`,
      },
    });

    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="text-center text-4xl font-extrabold text-blue-600 block">
          Trustedin
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {tab === 'login' ? 'Sign in to your account' : 'Create a new account'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(value) => {
              setTab(value as 'login' | 'signup');
              setError(null);
              setMessage(null);
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Signup</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              {/* Email */}
              <div className="grid gap-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div className="grid gap-2 relative">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Signup only) */}
              {tab === 'signup' && (
                <div className="grid gap-2 relative">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(prev => !prev)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> :
                  (tab === 'login' ? 'Login' : 'Sign up')}
              </Button>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* LinkedIn Login */}
              <Button variant="outline" className="w-full" onClick={handleLinkedInSignIn} type="button">
                <Linkedin className="mr-2 h-4 w-4" /> Sign in with LinkedIn
              </Button>

              {error && <p className="text-red-600 text-sm mt-2 text-center">{error}</p>}
              {message && <p className="text-green-600 text-sm mt-2 text-center">{message}</p>}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
