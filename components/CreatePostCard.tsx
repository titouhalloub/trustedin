"use client";

import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EmojiPicker } from "@/components/ui/emoji-picker";

import {
  X,
  Image,
  Video,
  FileText,
  BarChart2,
  Calendar,
  Globe2,
  Users,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Profile } from '@/lib/types';

interface CreatePostCardProps {
  profile: Profile;
  onPost: (newPost: any) => void; // Change onPost to accept the new post object
}

export const CreatePostCard = ({ profile, onPost }: CreatePostCardProps) => {
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [audience, setAudience] = useState("anyone");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useUser();
  const supabase = useSupabaseClient();

  const getInitials = (name: string = "") => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const previewUrl = URL.createObjectURL(file);
      setMediaPreview(previewUrl);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset file input
    }
  };

  const handlePost = async () => {
    // Ensure there is content and a logged-in user.
    // Allow posting if there is either content or a media file.
    if ((!content.trim() && !mediaFile) || !user || !supabase) {
      console.error('[DEBUG] Post creation stopped: No content, user, or supabase client.', {
        hasContent: !!content.trim(), hasUser: !!user, hasSupabase: !!supabase
      });
      return;
    }
    setIsPosting(true);

    let mediaUrls: string[] = [];

    console.log(`[DEBUG] Creating post for user: ${user.id}`);

    try {
      // 1. Upload media if it exists
      if (mediaFile) {
        const fileName = `${user.id}/${Date.now()}_${mediaFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post_media') // Assumes a bucket named 'post_media'
          .upload(fileName, mediaFile);

        if (uploadError) {
          throw uploadError;
        }

        // 2. Get public URL
        const { data: urlData } = supabase.storage
          .from('post_media')
          .getPublicUrl(uploadData.path);
        
        mediaUrls.push(urlData.publicUrl);
      }

      const newPost = {
        content,
        audience,
        createdAt: new Date(),
        media_urls: mediaUrls,
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from("posts")
        .insert([
          {
            content: newPost.content,
            audience: newPost.audience,
            created_at: newPost.createdAt.toISOString(),
            media_urls: newPost.media_urls,
            // Always use the authenticated user's ID for creating posts for security and consistency.
            author_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('[DEBUG] Supabase error creating post. This is likely an RLS (Row Level Security) issue. Check your `posts` table policies.', error);
        throw error;
      }
      console.log('[DEBUG] Post created successfully:', data);
      onPost(data); // Pass the newly created post back
    } catch (err) {
      console.error("Error in handlePost:", err);
    } finally {
      setIsPosting(false);
      setContent("");
      removeMedia();
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setContent((prev) => prev + emoji);
  };

  return (
    <Card className="rounded-2xl shadow-sm border">
      <CardContent className="p-4 space-y-3">
        {/* Audience Selector */}
        <div className="flex justify-between items-center border-b pb-2">
          <span className="text-sm font-medium">Create a post</span>
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger className="w-[140px] text-xs">
              <SelectValue placeholder="Audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anyone">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-4 w-4" /> Anyone
                </div>
              </SelectItem>
              <SelectItem value="connections">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> Connections
                </div>
              </SelectItem>
              <SelectItem value="group">Group</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Input */}
        <div className="flex items-start gap-3">
          <Avatar>
            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
            <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
          </Avatar>

          <div className="w-full space-y-2">
            <Textarea
              placeholder="What do you want to talk about?"
              className="border-none focus-visible:ring-0 shadow-none text-base resize-none min-h-[80px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            {mediaPreview && (
              <div className="relative mt-2">
                <img src={mediaPreview} alt="Preview" className="rounded-lg max-h-60 w-auto" />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0 rounded-full"
                  onClick={removeMedia}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*"
        />

        {/* Action Buttons */}
        <div className="flex justify-between items-center border-t pt-2">
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleImageClick}>
              <Image className="h-5 w-5 mr-1" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Video className="h-5 w-5 mr-1" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <FileText className="h-5 w-5 mr-1" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <BarChart2 className="h-5 w-5 mr-1" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Calendar className="h-5 w-5 mr-1" />
            </Button>

            {/* Emoji Picker */}
            <EmojiPicker onSelect={handleEmojiClick} />
          </div>

          <Button
            onClick={handlePost}
            disabled={(!content.trim() && !mediaFile) || isPosting}
            className="rounded-full"
          >
            {isPosting ? "Posting..." : "Post"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
