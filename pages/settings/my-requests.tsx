import { GetServerSideProps, NextPage } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/supabase-js';
import { useEffect, useState, useCallback } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send } from 'lucide-react';
import Image from 'next/image';

// Define the shape of a sent verification request
interface SentVerificationRequest {
  id: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  verifier: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const SentRequestsList = () => {
  const supabase = useSupabaseClient();
  const [requests, setRequests] = useState<SentVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSentRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch("/api/verifications/professional/sent", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${res.status}`);
      }
      const data: SentVerificationRequest[] = await res.json();
      setRequests(data || []);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSentRequests();
  }, [fetchSentRequests]);

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-10">Error loading requests: {error}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Sent Requests</CardTitle>
        <CardDescription>Track the status of verification requests you have sent to others.</CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground"><Send className="mx-auto h-12 w-12" />You haven't sent any requests yet.</div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Verifier</TableHead><TableHead>Sent On</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="flex items-center gap-3">
                    {req.verifier?.avatar_url ? (
                      <Image
                        src={req.verifier.avatar_url}
                        width={40} height={40}
                        className="rounded-full"
                        alt={req.verifier.full_name || 'User'}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {(req.verifier?.full_name?.[0] || req.verifier?.username?.[0] || '?').toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{req.verifier?.full_name || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">@{req.verifier?.username || 'user'}</div>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right"><Badge variant={getStatusVariant(req.status)}>{req.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

const MyRequestsPage: NextPage = () => {
  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto"><SentRequestsList /></div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const supabase = createPagesServerClient(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { redirect: { destination: '/login', permanent: false } };
  return { props: { user } };
};

export default MyRequestsPage;