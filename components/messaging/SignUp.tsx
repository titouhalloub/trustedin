import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SignUp() {
  const { supabase } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    console.log("🔵 Starting signup process for:", email);

    if (!supabase) {
      console.error("❌ Supabase client missing");
      setError("Supabase client is not available.");
      setLoading(false);
      return;
    }

    // 🔑 Step 1: Try to login intentionally
    console.log("🟡 Attempting signInWithPassword to detect existing account...");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("🔎 signInWithPassword result:", signInError);

    if (!signInError) {
      console.warn("✅ Existing user detected with correct password. Blocking signup.");
      setError("User already exists. Please log in instead.");
      setLoading(false);
      return;
    }

    if (signInError && signInError.message === "Invalid login credentials") {
      console.log("🟠 Could be wrong-password or no account. Proceeding with sign-up attempt...");

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: username,
            avatar_url: `https://api.dicebear.com/6.x/initials/svg?seed=${fullName}`,
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
      });

      console.log("🟢 signUp response:", { signUpError, signUpData });

      if (signUpError) {
        console.error("❌ signUpError:", signUpError.message);
        if (signUpError.message.includes("already registered")) {
          setError("User already exists. Please log in instead.");
        } else {
          setError(signUpError.message);
        }
      } else if (signUpData?.user && signUpData.user.identities?.length === 0) {
        console.warn("⚠️ Supabase indicates user exists but not confirmed.");
        setMessage("This user already exists. Please log in instead.");
      } else {
        console.log("✅ New user created, confirmation email sent.");
        setMessage("Success! Please check your email to confirm your account.");
      }
    }

    setLoading(false);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign Up</CardTitle>
        <CardDescription>Create your TrustedIn account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name">Full Name</Label>
            <Input id="full-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="e.g., janesmith" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {message && <p className="text-sm text-green-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing Up...' : 'Sign Up'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
