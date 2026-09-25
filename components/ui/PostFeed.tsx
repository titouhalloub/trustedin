"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Share2, ThumbsUp } from "lucide-react";

interface Post {
  id: number;
  content: string;
  audience: string;
  createdAt: Date;
  likes?: number;
  comments?: { id: number; text: string }[];
}

interface Profile {
  avatar_url?: string;
  full_name?: string;
}

export const PostFeed = ({
  posts,
  profile,
}: {
  posts: Post[];
  profile: Profile;
}) => {
  const [expandedPost, setExpandedPost] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card key={post.id} className="rounded-2xl shadow-sm border">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex gap-3">
              <Avatar>
                <AvatarImage
                  src={profile.avatar_url}
                  alt={profile.full_name}
                />
                <AvatarFallback>
                  {profile.full_name?.charAt(0).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium hover:underline cursor-pointer">
                  {profile.full_name ?? "User"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {post.createdAt.toLocaleString()} • {post.audience}
                </span>
              </div>
            </div>

            {/* Content */}
            <p className="mt-3 text-sm whitespace-pre-wrap">{post.content}</p>

            {/* Reactions / Actions */}
            <div className="mt-4 flex justify-between text-sm text-muted-foreground">
              <span>👍 {post.likes ?? 0}</span>
              <span>{post.comments?.length ?? 0} comments</span>
            </div>

            <div className="mt-2 flex justify-around border-t pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1"
              >
                <ThumbsUp size={16} /> Like
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1"
                onClick={() =>
                  setExpandedPost(expandedPost === post.id ? null : post.id)
                }
              >
                <MessageCircle size={16} /> Comment
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1"
              >
                <Share2 size={16} /> Share
              </Button>
            </div>

            {/* Comments Section */}
            {expandedPost === post.id && (
              <div className="mt-3 space-y-2">
                {(post.comments ?? []).map((c) => (
                  <div
                    key={c.id}
                    className="pl-2 border-l text-sm text-muted-foreground"
                  >
                    {c.text}
                  </div>
                ))}
                <input
                  type="text"
                  placeholder="Write a comment..."
                  className="w-full text-sm border rounded-md p-2 mt-2"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
