import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ShieldCheck, Clock, AlertTriangle } from 'lucide-react'; 
import DocumentUploadForm from '@/components/verification/DocumentUploadForm';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import DiditVerificationCard from '@/components/verification/DiditVerificationCard';

type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export default function VerificationPage() {
  const user = useUser();
  const supabase = useSupabaseClient();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchVerificationStatus = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('verification_level')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setStatus(data?.verification_level as VerificationStatus || 'unverified');
      } catch (error: any) {
        console.error('Error fetching verification status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVerificationStatus();
  }, [user, supabase]);

  const handleManualSubmission = () => {
    setStatus('pending');
    toast({
      title: "Submission Received",
      description: "Your document has been submitted for review. We'll notify you once it's processed.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === 'verified') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>You are Verified!</CardTitle>
            <CardDescription>Your identity has been successfully verified.</CardDescription>
          </CardHeader>
          <CardContent>
            <ShieldCheck className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <Button asChild>
              <Link href="/profile">Back to Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Verification Pending</CardTitle>
            <CardDescription>Your submission is under review. This can take up to 24 hours.</CardDescription>
          </CardHeader>
          <CardContent>
            <Clock className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <Button asChild>
              <Link href="/profile">Back to Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Verify Your Identity</h1>
          <p className="text-muted-foreground">Choose your preferred verification method.</p>
          {status === 'rejected' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p>Your previous submission was rejected. Please try again.</p>
            </div>
          )}
        </div>

        <DiditVerificationCard />
        
        <DocumentUploadForm onSubmission={handleManualSubmission} />
      </div>
    </div>
  );
}