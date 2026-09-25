import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Shield } from 'lucide-react';

export default function DiditVerificationCard() {
  const [diditLoading, setDiditLoading] = useState(false);

  const handleVerification = async () => {
    setDiditLoading(true);
    try {
      const res = await fetch('/api/verifications/didit-session', { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.session_url) {
        throw new Error(data.error || 'No session URL returned');
      }

      // Redirect user to Didit-hosted verification page
      window.location.assign(data.session_url);
    } catch (error: any) {
      console.error('Didit session error:', error.message);
      alert('Failed to start verification: ' + error.message);
      setDiditLoading(false);
    }
  };

  return (
    <Card className="border-primary ring-2 ring-primary">
      <CardHeader>
        <CardTitle>Verify with Didit (Recommended)</CardTitle>
        <CardDescription>
          Use our automated partner service for a fast and secure verification process.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleVerification} disabled={diditLoading} className="w-full">
          {diditLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
          Start Automatic Verification
        </Button>
      </CardContent>
    </Card>
  );
}
