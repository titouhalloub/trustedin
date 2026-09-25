import { useState, useRef, FormEvent, useEffect } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

interface ShareTrustScoreDialogProps {
  onClose: () => void;
  trustScoreCardRef: React.RefObject<HTMLDivElement>;
}

const ShareTrustScoreDialog = ({ onClose, trustScoreCardRef }: ShareTrustScoreDialogProps) => {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = useSupabaseClient();
  const { toast } = useToast();

  // Convert dataURL to Blob
  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  };

  // Force refresh session on mount
  useEffect(() => {
    if (!supabase) return;
    const refresh = async () => {
      await supabase.auth.refreshSession();
    };
    refresh();
  }, [supabase]);

  const handleLinkedInConnect = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: {
        scopes: "openid profile email w_member_social r_liteprofile",
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!trustScoreCardRef.current) {
      toast({ variant: "destructive", title: "Error", description: "Trust Score card not found." });
      return;
    }

    setIsLoading(true);
    try {
      // Convert HTML card to PNG
      const dataUrl = await toPng(trustScoreCardRef.current, { cacheBust: true });
      const imageBlob = dataURLtoBlob(dataUrl);
      if (!imageBlob) throw new Error("Failed to convert card to image.");

      // Prepare form data
      const formData = new FormData();
      formData.append("text", text);
      formData.append("image", imageBlob, "trust-score-card.png");

      // Call API
      const res = await fetch("/api/share-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to post to LinkedIn.");
      }

      toast({ title: "Success!", description: "Trust Score shared on LinkedIn." });
      onClose();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Ensure you are connected to LinkedIn to post.
        </p>
        <Button type="button" variant="outline" className="w-full" onClick={handleLinkedInConnect}>
          Connect / Refresh LinkedIn
        </Button>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment..."
        rows={4}
        required
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Posting..." : "Post to LinkedIn"}
        </Button>
      </div>
    </form>
  );
};

export default ShareTrustScoreDialog;
