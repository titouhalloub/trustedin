// pages/api/admin/users.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

// Define the shape of the user profile you want to return
interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string | null;
  created_at: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = createServerSupabaseClient({ req, res });

    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if the current user is an admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    const isSuperAdmin = session.user.email === process.env.SUPER_ADMIN_EMAIL;
    const isAdmin = profile?.role === 'admin';

    if (profileError || (!isAdmin && !isSuperAdmin)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Fetch all users from the profiles table
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, full_name, username, role, created_at");

    if (usersError) {
      return res.status(500).json({ error: usersError.message });
    }

    return res.status(200).json(users as UserProfile[]);
  } catch (err: any) {
    console.error("API /admin/users error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
