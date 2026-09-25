"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Heart,
  MessageCircle,
  Share,
  MoreHorizontal,
  Award,
  Shield,
  Paperclip,
  Trash2,
  Edit,
  X,
} from "lucide-react";
import { useUser } from '@supabase/auth-helpers-react';
import { Input } from "@/components/ui/input";
import { Profile, Post } from '@/lib/types';

import Link from 'next/link';

interface ProfileFeedProps {
  profile: Profile;
  posts: Post[];
  onDataRefresh?: () => void;
  isLoading?: boolean;
}

export const ProfileFeed = ({ profile, posts, onDataRefresh, isLoading = false }: ProfileFeedProps) => {
  const user = useUser();
  const supabase = useSupabaseClient();
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [commentingPostId, setCommentingPostId] = useState<number | null>(null);
  const [commentContent, setCommentContent] = useState("");
  const [commentMediaFile, setCommentMediaFile] = useState<File | null>(null);
  const [commentMediaPreview, setCommentMediaPreview] = useState<string | null>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPost) setEditedContent(editingPost.content);
  }, [editingPost]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getVerificationIcon = (level: string) => {
    switch (level) {
      case "premium":
        return <Award className="h-3 w-3 text-purple-500" />;
      case "verified":
        return <Shield className="h-3 w-3 text-green-500" />;
      default:
        return null;
    }
  };

  const handleCommentMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setCommentMediaFile(file);
      setCommentMediaPreview(URL.createObjectURL(file));
    }
  };

  const removeCommentMedia = () => {
    setCommentMediaFile(null);
    setCommentMediaPreview(null);
    if (commentFileInputRef.current) {
      commentFileInputRef.current.value = '';
    }
  };

  const handleLike = async (postId: number, userHasLiked: boolean) => {
    if (!user) return;

    if (userHasLiked) {
      await supabase.from("post_likes").delete().match({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    }
    onDataRefresh?.();
  };

  const handleComment = async (postId: number) => {
    if (!user || !commentContent.trim()) return;

    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: user.id,
      content: commentContent,
    });

    if (error) {
      console.error("Error posting comment:", error);
    } else {
      setCommentContent("");
      setCommentingPostId(null);
      onDataRefresh?.();
    }
  };

  const handleShare = async (postId: number) => {
    if (!user) return;
    // For now, just incrementing the share count via an insert.
    await supabase.from("post_shares").insert({ post_id: postId, user_id: user.id });
    onDataRefresh?.();
  };

  const handleDelete = async (postId: number) => {
    if (!user) return;
    const isConfirmed = window.confirm("Are you sure you want to delete this post?");
    if (isConfirmed) {
      await supabase.from("posts").delete().match({ id: postId, author_id: user.id });
      onDataRefresh?.();
    }
  };

  const handleEditSave = async () => {
    if (!editingPost || !user) return;

    const { error } = await supabase
      .from("posts")
      .update({ content: editedContent })
      .match({ id: editingPost.id, author_id: user.id });

    if (error) {
      console.error("Error updating post:", error);
    } else {
      setEditingPost(null);
      onDataRefresh?.();
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        Loading posts...
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        This user hasn't posted anything yet.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <Card
          key={post.id}
          className="shadow-sm hover:shadow-md transition-shadow"
        >
          <CardContent className="p-6">
            {/* Post Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <Link href={`/${post.author_id}`}>
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={post.author?.avatar_url ?? undefined}
                      alt={post.author?.full_name || 'User'}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                      {post.author?.full_name
                        ? getInitials(post.author.full_name)
                        : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/${post.author_id}`}>
                      <span className="font-semibold text-foreground hover:underline">
                        {post.author?.full_name || "Anonymous"}
                      </span>
                    </Link>
                    {getVerificationIcon(
                      post.author?.verification_level || "unverified"
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>@{post.author?.username || "user"}</span>
                    <span>•</span>
                    <span>{post.timestamp}</span>
                  </div>
                </div>
              </div>
              {user?.id === post.author_id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingPost(post)}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(post.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Post Content */}
            <div className="mb-4">
              {/* This is the corrected section */}
              {editingPost?.id === post.id ? (
                <div className="mt-2 space-y-2">
                  <Input
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="text-base"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setEditingPost(null)}>Cancel</Button>
                    <Button onClick={handleEditSave}>Save</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className="mt-4 rounded-lg overflow-hidden border border-border">
                      {/* For now, we'll just display the first image. This can be expanded to a gallery later. */}
                      <img
                        src={post.media_urls[0]}
                        alt="Post media"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Post Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-6">
                <Button
                  onClick={() => handleLike(post.id, post.user_has_liked)}
                  variant="ghost"
                  size="sm"
                  className={`text-muted-foreground hover:text-red-500 transition-colors ${
                    post.user_has_liked ? "text-red-500" : ""
                  }`}
                >
                  <Heart
                    className="h-4 w-4 mr-1"
                    fill={post.user_has_liked ? "currentColor" : "none"}
                  />
                  <span>{post.likes}</span>
                </Button>
                <Button
                  onClick={() =>
                    setCommentingPostId(
                      commentingPostId === post.id ? null : post.id
                    )
                  }
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-blue-500 transition-colors"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  <span>{post.comments}</span>
                </Button>
                <Button
                  onClick={() => handleShare(post.id)}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-green-500 transition-colors"
                >
                  <Share className="h-4 w-4 mr-1" />
                  <span>{post.shares}</span>
                </Button>
              </div>

              <Badge variant="secondary" className="text-xs capitalize">
                {post.type?.replace("_", " ") ?? "General Post"}
              </Badge>
            </div>

            {/* Comments Section */}
            {commentingPostId === post.id && (
              <div className="mt-4 space-y-4 border-t pt-4">
                <div className="space-y-2">
                  {commentMediaPreview && (
                    <div className="relative w-fit">
                      {commentMediaFile?.type.startsWith('image/') ? (
                        <img src={commentMediaPreview} alt="Preview" className="rounded-lg max-h-40 w-auto" />
                      ) : (
                        <video src={commentMediaPreview} controls className="rounded-lg max-h-40 w-auto" />
                      )}
                      <Button
                        variant="destructive" size="icon"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full"
                        onClick={removeCommentMedia}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a comment..."
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleComment(post.id)}
                    />
                    <input
                      type="file"
                      ref={commentFileInputRef}
                      onChange={handleCommentMediaSelect}
                      className="hidden"
                      accept="image/*,video/*"
                    />
                    <Button variant="ghost" size="icon" onClick={() => commentFileInputRef.current?.click()}>
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Button onClick={() => handleComment(post.id)} disabled={!commentContent.trim() && !commentMediaFile}>Post</Button>
                  </div>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {post.post_comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-2 text-sm">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.profiles.avatar_url ?? undefined} />
                        <AvatarFallback>{getInitials(comment.profiles.username)}</AvatarFallback>
                      </Avatar>
                      <div className="bg-muted p-2 rounded-lg">
                        <span className="font-semibold text-foreground">@{comment.profiles.username}</span>
                        {comment.content && <p className="text-muted-foreground">{comment.content}</p>}
                        {comment.media_url && (
                          <div className="mt-2">
                            {comment.media_type === 'image' ? (
                              <img src={comment.media_url} alt="Comment media" className="rounded-md max-h-60 w-auto" />
                            ) : comment.media_type === 'video' ? (
                              <video src={comment.media_url} controls className="rounded-md max-h-60 w-auto" />
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
