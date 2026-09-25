import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import Image from 'next/image';
import React from 'react';

interface SenderProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  badge_level?: string; // Add badge level to profile
}

export interface MessageType {
  id: string | number;
  content: string;
  sender_id: string;
  sender: SenderProfile | null;
  media_url?: string;
  media_type?: string;
  link_preview?: {
    url: string;
    title: string;
    description: string;
    image: string;
  } | null;
}

interface MessageProps {
  message: MessageType;
  isCurrentUser: boolean;
}

interface LinkPreviewProps {
  preview: MessageType['link_preview'];
}

// LinkPreview should be a standalone component defined outside of Message.
const LinkPreview = ({ preview }: LinkPreviewProps) => {
  // Don't render anything if there's no URL or title
  if (!preview?.url || !preview?.title) {
    return null;
  }

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 border rounded-lg overflow-hidden bg-white hover:bg-gray-50 transition"
    >
      {preview.image && (
        <div className="relative w-full aspect-video bg-muted">
          <Image
            src={preview.image}
            alt={preview.title}
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="p-3">
        <p className="font-semibold text-sm truncate">{preview.title}</p>
        {preview.description && (
          <p className="text-xs text-gray-600 line-clamp-2">
            {preview.description}
          </p>
        )}
        <p className="text-xs text-blue-500 mt-1 truncate">{preview.url}</p>
      </div>
    </a>
  );
};

export function Message({ message, isCurrentUser }: MessageProps) {
  const { sender, link_preview: preview } = message;

  // Function to detect URLs and remove them if preview exists
  const renderMessageText = (text: string, hasPreview: boolean) => {
    if (hasPreview) {
      // Remove any URLs from the text if we’re showing a preview card
      return text.replace(/https?:\/\/[^\s]+/g, "").trim();
    }
    return text;
  };

  return (
    <div className={`flex items-start gap-2 ${isCurrentUser ? "justify-end" : "justify-start"} mb-2`}>
      {!isCurrentUser && sender && (
        <Avatar className="h-8 w-8 self-start">
          <AvatarImage src={sender.avatar_url ?? undefined} alt={sender.full_name} />
          <AvatarFallback>{getInitials(sender.full_name)}</AvatarFallback>
        </Avatar>
      )}
      <div className={`max-w-xs rounded-lg ${isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
        <div className="p-2">
          {!isCurrentUser && sender?.full_name && (
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-semibold">{sender.full_name}</p>
              {sender.badge_level && sender.badge_level !== 'Newcomer' && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-background/50">{sender.badge_level}</span>
              )}
            </div>
          )}

          {/* ✅ Cleaned message text */}
          {renderMessageText(message.content, !!preview) && (
            <p className="whitespace-pre-wrap">
              {renderMessageText(message.content, !!preview)}
            </p>
          )}

          {/* ✅ File attachments */}
          {message.media_url && message.media_type === "file" && (
            <a
              href={message.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 bg-blue-500 text-white px-3 py-2 rounded flex items-center gap-2"
            >
              📎 View Attached File
            </a>
          )}

          {/* ✅ Uploaded image preview */}
          {message.media_url && message.media_type === "image" && (
            <a
              href={message.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 rounded-lg overflow-hidden"
            >
              <div className="relative w-48 h-48">
                <Image
                  src={message.media_url}
                  alt="uploaded"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            </a>
          )}

          {/* ✅ Link preview always shown under text */}
          {preview && <LinkPreview preview={preview} />}
        </div>
      </div>
    </div>
  );
}
