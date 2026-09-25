import { useState, useEffect } from 'react';
import { GetServerSidePropsContext } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

import { ConversationList } from '@/components/messaging/ConversationList';
import { ChatWindow } from '@/components/messaging/ChatWindow';
import { ProfileSidebar } from '../components/ProfileSidebar';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

// Import the simplified Conversation type
import { Conversation, ParticipantProfile } from '@/contexts/ChatContext';

interface MessagesPageProps {
  user: User;
  profile: any;
  initialConversations: Conversation[];
  initialSession: any;
}

export default function MessagesPage({ user, profile, initialConversations, initialSession }: MessagesPageProps) {
  const router = useRouter();
  const { conversationId } = router.query;
  const supabase = useSupabaseClient();
  
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    // This effect synchronizes the selected conversation with the URL or defaults to the first.
    if (conversations.length > 0) {
      // Determine the target conversation: either from the URL or the first in the list.
      const targetId = conversationId ? Number(conversationId) : conversations[0].id;
      const targetConversation = conversations.find(c => c.id === targetId);

      // Only update state if the target conversation is different from the currently selected one.
      // This is the key change that prevents an infinite re-render loop.
      if (targetConversation && targetConversation.id !== selectedConversation?.id) {
        setSelectedConversation(targetConversation);
      }
    }
  }, [conversationId, conversations, selectedConversation]);

  if (!supabase) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background max-w-screen-2xl mx-auto">
      <aside className="w-1/5 xl:w-1/4 sticky top-0 h-screen hidden md:block p-6">
        <ProfileSidebar profile={profile} onOpenLinkedInPost={() => {}} />
      </aside>
      <main className="w-full md:w-4/5 xl:w-3/4 flex h-screen">
        <div className="w-full md:w-1/3 border-r border-border flex flex-col">
          <ConversationList 
            conversations={conversations} 
            onSelectConversation={setSelectedConversation}
            selectedConversationId={selectedConversation?.id}
          />
        </div>
        <div className="hidden md:flex w-2/3 flex-col">
          {selectedConversation ? (
            <ChatWindow 
              key={selectedConversation.id}
              conversation={selectedConversation} 
              currentUser={user} 
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Select a conversation to start messaging.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const supabase = createPagesServerClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { redirect: { destination: '/auth', permanent: false } };
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();

  // Call the new RPC to get all conversations, perfectly formatted.
  const { data: initialConversations, error } = await supabase
    .rpc('get_my_conversations_list');

  if (error) console.error('Error fetching conversations:', error.message);

  return {
    props: {
      user: session.user,
      profile,
      initialConversations: initialConversations || [],
      initialSession: session,
    },
  };
};