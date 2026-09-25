import { GetServerSidePropsContext } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserCheck, UserX, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

interface ConnectionWithProfile {
  id: number;
  status: 'pending' | 'accepted';
  requester: Profile;
  addressee: Profile;
}

interface NetworkPageProps {
  user: User;
  initialReceivedRequests: ConnectionWithProfile[];
  initialSentRequests: ConnectionWithProfile[];
  initialConnections: ConnectionWithProfile[];
}

const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const ConnectionCard = ({ connection, type, onAction }: { connection: ConnectionWithProfile, type: 'received' | 'sent' | 'connection', onAction: () => void }) => {
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const router = useRouter();

  const profile = type === 'received' ? connection.requester : connection.addressee;

  const handleAccept = async () => {
    const { error } = await supabase.from('connections').update({ status: 'accepted' }).eq('id', connection.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Connection accepted." });
      onAction();
    }
  };

  const handleDeclineOrRemove = async () => {
    const { error } = await supabase.from('connections').delete().eq('id', connection.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Action completed." });
      onAction();
    }
  };

  return (
    <Card className="flex items-center justify-between p-4">
      <Link href={`/${profile.id}`} className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
          <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{profile.full_name}</p>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>
      </Link>
      <div className="flex gap-2">
        {type === 'received' && (
          <>
            <Button size="sm" onClick={handleAccept}><UserCheck className="mr-2 h-4 w-4" /> Accept</Button>
            <Button size="sm" variant="outline" onClick={handleDeclineOrRemove}><UserX className="mr-2 h-4 w-4" /> Decline</Button>
          </>
        )}
        {type === 'sent' && ( <Button size="sm" variant="outline" disabled>Pending</Button> )}
        {type === 'connection' && (
          <>
            <Button size="sm" variant="secondary" onClick={() => router.push(`/messages`)}><MessageSquare className="mr-2 h-4 w-4" /> Message</Button>
            <Button size="sm" variant="destructive" onClick={handleDeclineOrRemove}><UserX className="mr-2 h-4 w-4" /> Remove</Button>
          </>
        )}
      </div>
    </Card>
  );
};

export default function NetworkPage({ initialReceivedRequests, initialSentRequests, initialConnections }: NetworkPageProps) {
  const router = useRouter();
  const refreshData = () => router.replace(router.asPath);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">My Network</h1>
      <Tabs defaultValue="received">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="received">Received ({initialReceivedRequests.length})</TabsTrigger>
          <TabsTrigger value="connections">Connections ({initialConnections.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({initialSentRequests.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="received" className="mt-6">
          <div className="space-y-4">
            {initialReceivedRequests.length > 0 ? (
              initialReceivedRequests.map(c => <ConnectionCard key={c.id} connection={c} type="received" onAction={refreshData} />)
            ) : ( <p className="text-muted-foreground text-center">No pending requests.</p> )}
          </div>
        </TabsContent>
        <TabsContent value="connections" className="mt-6">
          <div className="space-y-4">
            {initialConnections.length > 0 ? (
              initialConnections.map(c => <ConnectionCard key={c.id} connection={c} type="connection" onAction={refreshData} />)
            ) : ( <p className="text-muted-foreground text-center">You have no connections yet.</p> )}
          </div>
        </TabsContent>
        <TabsContent value="sent" className="mt-6">
          <div className="space-y-4">
            {initialSentRequests.length > 0 ? (
              initialSentRequests.map(c => <ConnectionCard key={c.id} connection={c} type="sent" onAction={refreshData} />)
            ) : ( <p className="text-muted-foreground text-center">You haven't sent any requests.</p> )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/auth', permanent: false } };
  }

  const currentUserId = session.user.id;
  const profileFields = 'id, username, full_name, avatar_url';

  const fetchConnections = async (status: 'pending' | 'accepted', direction: 'received' | 'sent' | 'all') => {
    let query = supabase.from('connections').select(`id, status, requester:requester_id(${profileFields}), addressee:addressee_id(${profileFields})`).eq('status', status);

    if (direction === 'received') {
      query = query.eq('addressee_id', currentUserId);
    } else if (direction === 'sent') {
      query = query.eq('requester_id', currentUserId);
    } else {
      query = query.or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);
    }

    const { data, error } = await query;
    if (error) console.error(`Error fetching ${direction} ${status}:`, error);
    return data || [];
  };

  const [receivedRequests, sentRequests, connections] = await Promise.all([
    fetchConnections('pending', 'received'),
    fetchConnections('pending', 'sent'),
    fetchConnections('accepted', 'all'),
  ]);

  // Filter out the current user from the list of connections
  const filteredConnections = connections.map(c => ({
    ...c,
    addressee: (c.requester as any).id === currentUserId ? c.addressee : c.requester,
  }));

  return {
    props: {
      user: session.user,
      initialReceivedRequests: receivedRequests,
      initialSentRequests: sentRequests,
      initialConnections: filteredConnections,
      initialSession: session,
    },
  };
};