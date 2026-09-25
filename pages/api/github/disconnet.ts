// pages/api/github/disconnect.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createPagesServerClient({ req, res });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.redirect("/auth?error=not_signed_in");

  try {
    // Remove GitHub profile
    await supabase.from("github_profiles").delete().eq("id", user.id);
    await supabase.from("profiles").update({ github_username: null }).eq("id", user.id);

    // Redirect with success flag
    return res.redirect("/profile/edit?gh_disconnected=1");
  } catch (err) {
    console.error("GitHub disconnect failed:", err);
    return res.redirect("/profile/edit?error=gh_disconnect_failed");
  }
}
