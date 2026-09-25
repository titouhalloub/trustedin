import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Conversation } from '@/contexts/ChatContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, X, Paperclip, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Message } from './Message';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useDebounce } from 'use-debounce';

const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

interface FloatingChatWindowProps {
  conversation: Conversation;
  currentUser: any; // Using 'any' for now, but should be a specific User/Profile type
}

export function FloatingChatWindow({ conversation, currentUser }: FloatingChatWindowProps) {
  const { closeChat } = useChat();
  const { toast } = useToast();
  const supabase = useSupabaseClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [linkPreview, setLinkPreview] = useState<any | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [debouncedNewMessage] = useDebounce(newMessage, 500);

  const participant = conversation.other_participant;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!conversation?.id || !supabase) return;

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(id, full_name, avatar_url, badge_level), link_preview')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching messages:', error);
        setLoading(false);
        return;
      }

      // ✅ Parse link_preview JSON safely
      const parsed = (data || []).map((msg) => ({
        ...msg,
        link_preview:
          typeof msg.link_preview === "string"
            ? JSON.parse(msg.link_preview)
            : msg.link_preview,
      }));
      setMessages(parsed);
      setLoading(false);
    };

    fetchMessages();

    const channel = supabase.channel(`floating-chat:${conversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` }, 
      async (payload) => {
        // Ignore updates from the current user, as they are handled optimistically.
        if (payload.new.sender_id === currentUser.id) {
          return;
        }

        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, badge_level')
          .eq('id', payload.new.sender_id)
          .single();
        
        const newMessageWithSender = { ...payload.new, sender: senderProfile };
        setMessages(currentMessages => [...currentMessages, newMessageWithSender]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id, supabase, currentUser]);

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const fetchLinkPreview = async () => {
      const urlRegex = /(https?:\/\/[^\s]+)/;
      const match = debouncedNewMessage.match(urlRegex);
      if (match && !mediaFile) {
        setIsFetchingPreview(true);
        setLinkPreview(null);
        try {
          const response = await fetch(`/api/link-preview?url=${encodeURIComponent(match[0])}`);
          if (response.ok) {
            const preview = await response.json();
            setLinkPreview(preview);
          }
        } catch (error) {
          console.error("Failed to fetch link preview:", error);
        } finally {
          setIsFetchingPreview(false);
        }
      } else {
        setLinkPreview(null);
      }
    };
    fetchLinkPreview();
  }, [debouncedNewMessage, mediaFile]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((newMessage.trim() === '' && !mediaFile) || !currentUser) {
      return;
    }

    let media_url: string | null = null;
    let media_type: string | null = null;

    // 1. Upload media if it exists
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

    // 2. Insert message record
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

    const { data, error } = await supabase.from('messages').insert(messageToInsert).select();

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
      };
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
        // Use a special string to indicate a generic file
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

  if (!participant) return null;

  return (
    <div className="w-80 h-[450px] bg-background border border-border rounded-t-lg shadow-2xl flex flex-col">
      <header className="flex items-center justify-between p-2 border-b bg-card cursor-pointer rounded-t-lg">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={participant.avatar_url ?? undefined} />
            <AvatarFallback>{getInitials(participant.full_name)}</AvatarFallback>
          </Avatar>
          <p className="font-semibold text-sm">{participant.full_name}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => closeChat(conversation.id)}>
          <X size={16} />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? <p>Loading...</p> : messages.map(msg => (
          <Message key={msg.id} message={msg} isCurrentUser={msg.sender_id === currentUser?.id} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-2 border-t flex flex-col gap-2 bg-background">
        {isFetchingPreview && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Fetching link preview...</span>
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
        <div className="flex items-center gap-2">
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
        </div>
      </form>
    </div>
  );
}