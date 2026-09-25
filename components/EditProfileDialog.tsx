import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import { Profile } from '@/lib/types';

interface EditProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onProfileUpdate: () => Promise<void>;
}

export const EditProfileDialog = ({ isOpen, onClose, profile, onProfileUpdate }: EditProfileDialogProps) => {
  const user = useUser();
  const supabase = useSupabaseClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [githubProfile, setGithubProfile] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    bio: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user || !supabase) return;
    const userId = user.id;
    let isCancelled = false;

    const fetchGithubProfile = async () => {
      try {
        const { data } = await supabase
          .from('github_profiles')
          .select('id,username,synced_at')
          .eq('id', userId)
          .maybeSingle();
        if (!isCancelled) setGithubProfile(data ?? null);
      } catch (error) {
        if (!isCancelled) setGithubProfile(null);
      }
    };

    if (isOpen) fetchGithubProfile();

    return () => { isCancelled = true; };
  }, [user, isOpen, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          username: formData.username,
          bio: formData.bio,
          avatar_url: formData.avatar_url
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      await onProfileUpdate();
      onClose();
    } catch (error) {
      const supabaseError = error as any;
      console.error("Profile update error:", supabaseError);
      if (supabaseError.code === '23505') { // PostgreSQL unique violation code
        toast({
          title: "Username Taken",
          description: "This username is already in use. Please choose a different one.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: supabaseError.message || "Failed to update profile. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !supabase) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: data.publicUrl }));
      
      toast({
        title: "Success",
        description: "Avatar uploaded successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleGitHubConnect = async () => {
    // This was the source of the error. Correcting to use the server-side endpoint.
    window.location.href = `/api/github/start?redirect_to=${process.env.NEXT_PUBLIC_APP_URL}/profile/edit`;
  };

  const handleGitHubSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/sync-github', {
        method: 'POST',
        credentials: 'include', // <--- critical
        headers: { 'Content-Type': 'application/json' },
      });
      const responseText = await response.text();

      if (!response.ok) {
        let errorMsg = `GitHub sync failed: ${response.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.error || errorMsg;
        } catch (e) { /* Not a JSON response, use statusText */ }
        throw new Error(errorMsg);
      }

      const data = JSON.parse(responseText);
      toast({
        title: "Success",
        description: data.message || "GitHub data synced successfully.",
      });
      // Refresh profile data to show new trust score
      await onProfileUpdate();
    } catch (error) {
      console.error("GitHub sync error:", error);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to sync GitHub data.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const isGitHubConnected = !!githubProfile;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative group">
              <Avatar className="h-24 w-24">
                <AvatarImage src={formData.avatar_url ?? undefined} alt="Profile" />
                <AvatarFallback className="text-lg font-bold bg-gradient-trust text-white">
                  {formData.full_name ? getInitials(formData.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <Upload className="h-6 w-6 text-white" />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading}
              />
            </div>
            <p className="text-sm text-muted-foreground">Click to upload new profile picture</p>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter your username"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Connected Accounts Section */}
          <div className="col-span-1 md:col-span-2 border-t pt-4">
            <Label>Connected Accounts</Label>
            <div className="flex items-center justify-between mt-2 p-3 border rounded-lg">
              <span className="font-medium">GitHub</span>
              {isGitHubConnected ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Connected</span>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={handleGitHubSync} disabled={isSyncing}>
                    {isSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Sync
                  </Button>
                </div>
              ) : (
                <Button type="button" onClick={handleGitHubConnect}>
                  Connect
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Connect your GitHub account to include your repository and contribution data in your trust score.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};