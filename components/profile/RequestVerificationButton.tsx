// /components/profile/RequestVerificationButton.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Send } from 'lucide-react';

interface RequestVerificationButtonProps {
  relatedEntityId: string;
}

export default function RequestVerificationButton({ relatedEntityId }: RequestVerificationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [verifierEmail, setVerifierEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      if (!response.ok) {
        throw new Error(result.error || 'An unknown error occurred.');
      }

      toast({
        title: 'Request Sent!',
        description: `Your verification request has been sent to ${verifierEmail}.`,
      });
      setIsOpen(false);
      setVerifierEmail('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send Request',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        Request Verification
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Professional Verification</DialogTitle>
            <DialogDescription>
              Enter the email of a manager, colleague, or HR representative who can verify this experience.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="verifier-email" className="text-right">Verifier's Email</Label>
                <Input id="verifier-email" type="email" value={verifierEmail} onChange={(e) => setVerifierEmail(e.target.value)} className="col-span-3" placeholder="manager@example.com" required />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
