// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getInitials = (name: string = '') => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const transformRawPost = (p: any, currentUserId: string) => {
  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return {
    ...p,
    likes: p.likes?.[0]?.count || 0,
    comments: p.comments?.[0]?.count || 0,
    shares: p.shares?.[0]?.count || 0,
    hasImage: p.media_urls && p.media_urls.length > 0,
    timestamp: timeAgo(p.created_at),
    user_has_liked: p.user_likes?.some((like: { user_id: string }) => like.user_id === currentUserId),
    post_comments: p.post_comments || [],
  };
};
