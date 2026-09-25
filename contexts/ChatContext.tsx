'use client';
import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import type { Conversation, ParticipantProfile } from '@/lib/types';
export type { Conversation, ParticipantProfile };

interface ChatContextType {
  openChats: Conversation[];
  openChat: (conversation: Conversation) => void;
  closeChat: (conversationId: number) => void;
  selectedConversation: Conversation | null;
  setSelectedConversation: Dispatch<SetStateAction<Conversation | null>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [openChats, setOpenChats] = useState<Conversation[]>([]);

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const openChat = (conversation: Conversation) => {
    if (!openChats.some(c => c.id === conversation.id)) {
      setOpenChats(prev => [conversation, ...prev].slice(0, 3));
    }
  };

  const closeChat = (conversationId: number) => {
    setOpenChats(prev => prev.filter(c => c.id !== conversationId));
  };

  return (
    <ChatContext.Provider value={{ openChats, openChat, closeChat, selectedConversation, setSelectedConversation }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};