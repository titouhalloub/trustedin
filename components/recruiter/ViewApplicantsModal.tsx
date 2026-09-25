import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getInitials } from '@/lib/utils';

interface Applicant {
  id: number;
  status: string;
  created_at: string;
  candidate: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    headline: string | null;
  };
}

interface ViewApplicantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number | null;
  jobTitle: string | null;
}

export const ViewApplicantsModal = ({ isOpen, onClose, jobId, jobTitle }: ViewApplicantsModalProps) => {
  const supabase = useSupabaseClient();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId || !isOpen) return;

    const fetchApplicants = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_applications')
        .select('id, status, created_at, candidate:profiles!inner(id, full_name, avatar_url, headline)')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching applicants:', error);
      } else {
        // Safely map the data to handle cases where 'candidate' might be an array
        const formattedData = data.map((item: any) => ({
          ...item,
          candidate: Array.isArray(item.candidate) ? item.candidate[0] : item.candidate,
        }));
        setApplicants(formattedData as Applicant[]);
      }
      setLoading(false);
    };

    fetchApplicants();
  }, [jobId, isOpen, supabase]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Applicants for "{jobTitle}"</DialogTitle>
          <DialogDescription>Review candidates who have applied for this position.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Candidate</TableHead><TableHead>Status</TableHead><TableHead>Applied</TableHead></TableRow></TableHeader>
            <TableBody>
              {applicants.map(app => (
                <TableRow key={app.id}>
                  <TableCell>
                    <Link href={`/${app.candidate.id}`} className="flex items-center gap-3 hover:underline"><Avatar><AvatarImage src={app.candidate.avatar_url ?? undefined} /><AvatarFallback>{getInitials(app.candidate.full_name)}</AvatarFallback></Avatar><div><p className="font-medium">{app.candidate.full_name}</p><p className="text-sm text-muted-foreground">{app.candidate.headline}</p></div></Link>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{app.status}</Badge></TableCell>
                  <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        { !loading && applicants.length === 0 && <p className="text-center py-10 text-muted-foreground">No applicants yet.</p> }
      </DialogContent>
    </Dialog>
  );
};