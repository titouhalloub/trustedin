import { useChat } from '@/contexts/ChatContext';
import { useUser } from '@supabase/auth-helpers-react';
import { FloatingChatWindow } from './FloatingChatWindow';

export function ChatDock() {
  const { openChats } = useChat();
  const user = useUser();

  if (openChats.length === 0 || !user) {
    return null;
  }

  return (
    <div className="fixed bottom-0 right-4 flex items-end gap-4 z-50">
      {openChats.map(chat => <FloatingChatWindow key={chat.id} conversation={chat} currentUser={user} />)}
    </div>
  );
}