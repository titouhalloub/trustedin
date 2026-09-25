import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Conversation } from '@/contexts/ChatContext';
import { getInitials } from '@/lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: number;
}

export function ConversationList({ conversations, onSelectConversation, selectedConversationId }: ConversationListProps) {
  if (!conversations || conversations.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Messages</h2>
        </div>
        <div className="flex-grow flex items-center justify-center text-center text-muted-foreground p-4">
          <p>You have no messages yet. Start a conversation from someone's profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Messages</h2>
      </div>
      <div className="flex-grow overflow-y-auto">
        {conversations.map(convo => {
          const participant = convo.other_participant;
          if (!participant) return null;
          
          return (
            <div 
              key={convo.id} 
              onClick={() => onSelectConversation(convo)}
              className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-muted ${selectedConversationId === convo.id ? 'bg-muted' : ''}`}
            >
              <Avatar>
                <AvatarImage src={participant.avatar_url ?? undefined} alt={participant.full_name} />
                <AvatarFallback>{getInitials(participant.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-grow overflow-hidden">
                <p className="font-semibold truncate">{participant.full_name}</p>
                <p className="text-sm text-muted-foreground truncate">{convo.last_message?.content || '...'}</p>
              </div>
              <time className="text-xs text-muted-foreground self-start">
                {convo.last_message_at ? formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: true }) : ''}
              </time>
            </div>
          )
        })}
      </div>
    </div>
  );
}