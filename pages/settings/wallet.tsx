import { GetServerSideProps, NextPage } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/supabase-js';
import { useEffect, useState, useCallback } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Wallet, TrendingUp, TrendingDown } from 'lucide-react';

interface CreditTransaction {
  id: number;
  created_at: string;
  amount: number;
  reason: string;
}

interface CreditHistoryResponse {
  current_balance: number;
  history: CreditTransaction[];
}

const WalletPage: NextPage<{ user: User }> = () => {
  const supabase = useSupabaseClient();
  const [creditData, setCreditData] = useState<CreditHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCreditHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch("/api/credits/history", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${res.status}`);
      }
      const data: CreditHistoryResponse = await res.json();
      setCreditData(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCreditHistory();
  }, [fetchCreditHistory]);

  if (loading) {
    return <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-20">Error loading credit history: {error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet /> My Wallet</CardTitle>
          <CardDescription>View your credit balance and transaction history.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{creditData?.current_balance ?? 0}</p>
          <p className="text-muted-foreground">Available Credits</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
        <CardContent>
          {creditData?.history && creditData.history.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {creditData.history.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{new Date(tx.created_at).toLocaleString()}</TableCell>
                    <TableCell className="capitalize">{tx.reason.replace(/_/g, ' ')}</TableCell>
                    <TableCell className={`text-right font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {tx.amount > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-10">No transactions yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const supabase = createPagesServerClient(context);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { redirect: { destination: '/login', permanent: false } };
  return { props: { user } };
};

export default WalletPage;