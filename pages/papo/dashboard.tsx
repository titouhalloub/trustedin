import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/router';
interface Papo {
  slug: string | null;
  id: string;
  title: string | null;
  engagement_metrics: {
    views?: number;
    likes?: number;
    comments?: number;
  } | null;
  profiles: {
    username: string;
  } | null;
}
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Eye, Heart, MessageCircle, Edit, Trash2 } from 'lucide-react';

const PapoDashboardPage = () => {
  const supabase = useSupabaseClient();
  const user = useUser(); // Use the hook to get the user
  const [papos, setPapos] = useState<Papo[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchPapos = async () => {
      if (user) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('papo')
            .select(`
              id, 
              title, 
              engagement_metrics,
              slug,
              profiles!inner ( username )
            `)
            .eq('user_id', user.id);

          if (error) throw error;
          // The 'data' is correctly typed now because the query is inside the 'if (user)' block
          // and we are using the more specific select.
          // We cast to unknown first to satisfy TypeScript's strict checking.
          setPapos(data as unknown as Papo[]);
        } catch (error) {
          console.error('Error fetching papos:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    fetchPapos();
  }, [supabase, user]);

  const handleDelete = async (papoId: string) => {
    if (!window.confirm('Are you sure you want to delete this Papo?')) {
      return;
    }

    try {
      const { error } = await supabase.from('papo').delete().eq('id', papoId);
      if (error) throw error;

      toast({
        title: 'Papo Deleted',
        description: 'The Papo has been successfully deleted.',
      });
      // Refresh the list after deletion
      setPapos(papos.filter(p => p.id !== papoId));
    } catch (error: any) {
      toast({
        title: 'Error Deleting Papo',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading && !papos.length) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Papo Dashboard</h1>
        <Button asChild>
          <Link href="/papo/new">Create New Papo</Link>
        </Button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <table className="min-w-full bg-white border">
          <thead className="bg-muted/50">
            <tr>
              <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Title</th>
              <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">Views</th>
              <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">Likes</th>
              <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">Comments</th>
              <th className="py-3 px-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {papos.map((papo) => (
              <tr key={papo.id} className="hover:bg-muted/50">
                <td className="border-t px-4 py-3 font-medium">{papo.title}</td>
                <td className="border-t px-4 py-3 text-center">{papo.engagement_metrics?.views || 0}</td>
                <td className="border-t px-4 py-3 text-center">{papo.engagement_metrics?.likes || 0}</td>
                <td className="border-t px-4 py-3 text-center">{papo.engagement_metrics?.comments || 0}</td>
                <td className="border-t px-4 py-3 text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => router.push(`/papo/edit/${papo.id}`)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(papo.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {papos.map((papo) => (
          <Card key={papo.id}>
            <CardContent className="p-4 space-y-3">
              <Link href={`/papo/${papo.profiles?.username}/${papo.slug}`} className="font-bold text-lg hover:underline">
                {papo.title}
              </Link>
              <div className="flex justify-between items-center text-sm text-muted-foreground border-t pt-3">
                <div className="flex items-center gap-1"><Eye className="h-4 w-4" /> {papo.engagement_metrics?.views || 0}</div>
                <div className="flex items-center gap-1"><Heart className="h-4 w-4" /> {papo.engagement_metrics?.likes || 0}</div>
                <div className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {papo.engagement_metrics?.comments || 0}</div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => router.push(`/papo/edit/${papo.id}`)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(papo.id)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && papos.length === 0 && (
        <div className="text-center py-12 border rounded-lg mt-4">
          <h2 className="text-xl font-semibold">No Papos Yet</h2>
          <p className="text-muted-foreground mt-2">Click "Create New Papo" to get started.</p>
        </div>
      )}
    </div>
  );
};

export default PapoDashboardPage;
