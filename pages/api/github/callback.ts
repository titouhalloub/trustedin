// pages/api/github/callback.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { parse, serialize } from "cookie";

const CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID!;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parse(req.headers.cookie || "");
  const storedState = cookies.github_oauth_state;

  const { code, state } = req.query;

  // --- CSRF protection ---
  if (!state || typeof state !== "string" || state !== storedState) {
    return res.status(403).send("Invalid state parameter. CSRF attack detected.");
  }

  if (!code || typeof code !== "string") {
    return res.status(400).send("Missing code parameter.");
  }

  // --- Exchange code for GitHub access token ---
  try {
    const params = new URLSearchParams();
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("code", code);
    params.append("redirect_uri", `${process.env.NEXT_PUBLIC_SITE_URL}/api/github/callback`);

    const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const tokenData = await tokenResp.json();
    console.log("GitHub TOKEN RESPONSE:", tokenData);

    if (!tokenResp.ok || !tokenData.access_token) {
      return res.redirect("/profile/edit?error=gh_connection_failed");
    }

    const githubToken = tokenData.access_token;

    // --- Supabase: get logged-in user ---
    const supabase = createPagesServerClient({ req, res });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.redirect("/auth?error=not_signed_in");

    // --- Clear CSRF state cookie ---
    res.setHeader(
      "Set-Cookie",
      serialize("github_oauth_state", "", {
        httpOnly: true,
        path: "/",
        expires: new Date(0),
      })
    );

    // --- Fetch GitHub profile ---
    const ghProfileResp = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const gh = await ghProfileResp.json();
    if (!ghProfileResp.ok || !gh.login) {
      console.error("Failed to fetch GitHub profile:", gh);
      return res.redirect("/profile/edit?error=gh_connection_failed");
    }

    // --- Upsert GitHub profile in Supabase ---
    await supabase.from("github_profiles").upsert({
      id: user.id,
      username: gh.login,
      token: githubToken,
      followers: gh.followers ?? 0,
      public_repos: gh.public_repos ?? 0,
      synced_at: new Date().toISOString(),
    });

    // --- Update main profile ---
    await supabase.from("profiles").update({ github_username: gh.login }).eq("id", user.id);

    // --- Optionally recalc trust score ---
    await supabase.rpc("calculate_and_update_trust_score", { profile_id: user.id });

    return res.redirect("/profile/edit?gh_connected=1");
  } catch (err) {
    console.error("GitHub callback error:", err);
    return res.redirect("/profile/edit?error=gh_connection_failed");
  }
}
