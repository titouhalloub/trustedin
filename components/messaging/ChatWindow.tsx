import { useState, useEffect, useRef } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, X } from 'lucide-react';
import { Message, MessageType } from './Message';
import { useToast } from '@/components/ui/use-toast';
import { useDebounce } from 'use-debounce';
import { Conversation } from '@/contexts/ChatContext';
import { getInitials } from '@/lib/utils';
import { User } from '@supabase/supabase-js';

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
}

export function ChatWindow({ conversation, currentUser }: ChatWindowProps) {
  const { toast } = useToast();
  const supabase = useSupabaseClient();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [linkPreview, setLinkPreview] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [debouncedNewMessage] = useDebounce(newMessage, 500);
  const participant = conversation.other_participant;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!supabase) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(id, full_name, avatar_url, badge_level), link_preview')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // ✅ Parse link_preview JSON safely
      const parsed = data.map((msg) => ({
        ...msg,
        link_preview:
          typeof msg.link_preview === "string"
            ? JSON.parse(msg.link_preview)
            : msg.link_preview,
      }));

      setMessages(parsed || []);
    };

    fetchMessages();
  }, [conversation.id, supabase]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchLinkPreview = async () => {
      const urlRegex = /(https?:\/\/[^\s]+)/;
      const match = debouncedNewMessage.match(urlRegex);
      if (match && !mediaFile) {
        setLinkPreview(null);
        try {
          const response = await fetch(`/api/link-preview?url=${encodeURIComponent(match[0])}`);
          if (response.ok) {
            const preview = await response.json();
            setLinkPreview(preview);
          }
        } catch (error) {
          console.error("Failed to fetch link preview:", error);
        }
      } else {
        setLinkPreview(null);
      }
    };
    fetchLinkPreview();
  }, [debouncedNewMessage, mediaFile]);

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase.channel(`messages:${conversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` }, async (payload) => {
        // Ignore updates from the current user, as they are handled optimistically.
        if (payload.new.sender_id === currentUser.id) {
          return;
        }

        const { data: senderProfile, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, badge_level')
          .eq('id', payload.new.sender_id)
          .single();

        if (error) {
          console.error('Error fetching sender profile for new message:', error);
          return;
        }
        
        const newMessageWithSender = {
          ...payload.new,
          sender: senderProfile,
        } as MessageType;
        setMessages(currentMessages => [...currentMessages, newMessageWithSender]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, supabase, currentUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!newMessage.trim() && !mediaFile) || !currentUser) {
      return;
    }

    let media_url: string | null = null;
    let media_type: string | null = null;

    if (mediaFile) {
      const filePath = `chat_media/${conversation.id}/${Date.now()}-${mediaFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat_media')
        .upload(filePath, mediaFile);

      if (uploadError) {
        toast({ title: "Error", description: `Failed to upload file: ${uploadError.message}`, variant: "destructive" });
        return;
      }

      const { data: urlData } = supabase.storage.from('chat_media').getPublicUrl(uploadData.path);
      media_url = urlData.publicUrl;
      media_type = mediaFile.type.startsWith('image/') ? 'image' : 'file';
    }

    const messageToInsert: any = {
      content: newMessage,
      sender_id: currentUser.id,
      conversation_id: conversation.id,
      media_url,
      media_type,
    };

    // Attach link preview if it exists
    if (linkPreview && !mediaFile) {
      messageToInsert.link_preview = linkPreview;
    }

    // Add .select() to get feedback on whether the insert was successful.
    const { data, error } = await supabase
      .from('messages')
      .insert(messageToInsert)
      .select();

    // If there's an explicit error OR if the insert was silently aborted by RLS (data is null/empty), show an error.
    if (error || !data || data.length === 0) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: `Failed to send message. ${error ? error.message : 'You may not have permission or the connection was lost.'}`,
        variant: "destructive",
      });
    } else {
      // The message was sent. Now, add it to the local state to make it appear instantly.
      const newMessageWithSender = {
        ...data[0],
        sender: {
          id: currentUser.id,
          full_name: currentUser.user_metadata.full_name,
          avatar_url: currentUser.user_metadata.avatar_url,
        }
      } as MessageType;
      setMessages(currentMessages => [...currentMessages, newMessageWithSender]);
      setNewMessage('');
      removeMedia();
      setLinkPreview(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setLinkPreview(null); // Disable link preview when a file is selected
      if (file.type.startsWith('image/')) {
        setMediaPreview(URL.createObjectURL(file));
      } else {
        setMediaPreview('file');
      }
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!supabase) {
    return <div className="flex items-center justify-center h-full">Initializing chat...</div>;
  }

  // Add a check for the participant to prevent errors if the conversation object is malformed.
  if (!participant) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Unable to load participant details.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b flex items-center gap-3">
        <Avatar>
          <AvatarImage src={participant.avatar_url ?? undefined} alt={participant.full_name} />
          <AvatarFallback>{getInitials(participant.full_name)}</AvatarFallback>
        </Avatar>
        <p className="font-semibold">{participant.full_name}</p>
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.map(msg => (
          <Message key={msg.id} message={msg} isCurrentUser={msg.sender_id === currentUser.id} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t bg-background flex flex-col gap-2">
        {mediaPreview && (
          <div className="relative w-fit p-2 border rounded-md bg-muted">
            {mediaPreview === 'file' ? (
              <div className="flex items-center gap-2 text-sm">
                <Paperclip className="h-4 w-4" />
                <span className="max-w-48 truncate">{mediaFile?.name}</span>
              </div>
            ) : (
              <img src={mediaPreview} alt="Preview" className="max-h-24 rounded" />
            )}
            <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-background" onClick={removeMedia}>
              <X size={12} />
            </Button>
          </div>
        )}
        {linkPreview && !mediaFile && (
          <div className="relative p-2 border rounded-md bg-muted">
            <div className="flex gap-3">
              {linkPreview.image && <img src={linkPreview.image} className="w-20 h-20 object-cover rounded-md" />}
              <div className="flex-1 overflow-hidden">
                <p className="font-bold truncate">{linkPreview.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{linkPreview.description}</p>
              </div>
            </div>
             <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-background" onClick={() => setLinkPreview(null)}>
              <X size={12} />
            </Button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
