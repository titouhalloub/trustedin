import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Copy, Loader2, Send } from 'lucide-react';

interface RequestVerificationButtonProps {
  relatedEntityId: string;
}

export default function RequestVerificationButton({ relatedEntityId }: RequestVerificationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [verifierEmail, setVerifierEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('/api/verifications/professional/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verifier_email: verifierEmail,
          related_entity_id: relatedEntityId,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not send the invitation.');

      if (result.emailSent === false && typeof result.inviteUrl === 'string') {
        setShareLink(result.inviteUrl);
        toast({
          title: 'Invitation link created',
          description: 'Email delivery is unavailable right now. Copy the secure link below and send it to the verifier yourself.',
        });
      } else {
        toast({
          title: 'Invitation email sent',
          description: 'A TrustedIn verification invitation was sent to ' + verifierEmail + '. Ask them to check their inbox and spam folder if needed.',
        });
        setIsOpen(false);
        setVerifierEmail('');
        setShareLink('');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Invitation failed',
        description: error.message || 'Could not send the invitation.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { setShareLink(''); setVerifierEmail(''); setIsOpen(true); }}>
        Request Verification
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Professional Verification</DialogTitle>
            <DialogDescription>
              Enter the work email of a manager, colleague, or HR representative who can verify this experience or education entry. We will email a secure TrustedIn link when delivery is available. If email delivery is blocked, you can copy the link and send it yourself.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {!shareLink && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="verifier-email" className="text-right">Professional email</Label>
                  <Input
                    id="verifier-email"
                    type="email"
                    value={verifierEmail}
                    onChange={(event) => setVerifierEmail(event.target.value)}
                    className="col-span-3"
                    placeholder="manager@company.com"
                    required
                  />
                </div>
              )}
              {shareLink && (
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Share this secure verification link</p>
                  <Input aria-label="Secure verification link" readOnly value={shareLink} />
                  <p className="text-sm text-muted-foreground">The link expires in 7 days. The verifier must sign in with {verifierEmail.trim()} to respond.</p>
                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareLink);
                        toast({ title: 'Link copied', description: 'Send the copied link to the intended verifier.' });
                      } catch {
                        toast({ variant: 'destructive', title: 'Could not copy link', description: 'Select and copy the link from the field above.' });
                      }
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy verification link
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => { setIsOpen(false); setShareLink(''); }}>Close</Button>
              {!shareLink && (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send invitation
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
