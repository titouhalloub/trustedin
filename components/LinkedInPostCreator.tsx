import { useState, FormEvent } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";

const LinkedInPostCreator = () => {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = useSupabaseClient();

  const handleLinkedInConnect = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: { 
        scopes: 'openid profile email w_member_social',
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });
  };
  
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus("Posting...");

    try {
      const response = await fetch("/api/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      setStatus(`Successfully posted! Post ID: ${data.postId}`);
      setText("");
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <p>First, ensure you are connected to LinkedIn:</p>
      <button onClick={handleLinkedInConnect}>
        Connect/Refresh LinkedIn
      </button>
      <h2>Create a LinkedIn Post</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What do you want to talk about?"
          rows={5}
          cols={50}
          required
        />
        <br />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Posting..." : "Post to LinkedIn"}
        </button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
};

export default LinkedInPostCreator;