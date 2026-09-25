// pages/api/admin/posts.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Basic env checks
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing Supabase env:", {
      NEXT_PUBLIC_SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!SERVICE_ROLE_KEY,
    });
    return res.status(500).json({ error: "Server misconfiguration: missing SUPABASE env vars" });
  }

  // Create server-side client with service role (no session persistence)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    console.log("[/api/admin/posts] STEP: simple select * (limit 5)");
    // 1) Basic sanity check: can we read posts at all?
    const simple = await supabase.from("posts").select("id, content, created_at").limit(5);
    console.log("[/api/admin/posts] simple:", {
      error: simple.error ? simple.error.message : null,
      dataCount: Array.isArray(simple.data) ? simple.data.length : typeof simple.data,
    });
    if (simple.error) {
      return res.status(500).json({ stage: "simple", error: simple.error.message });
    }

    // 2) Try the inferred relation (works when FK is configured)
    console.log("[/api/admin/posts] STEP: inferred relation select (profiles(...))");
    const inferred = await supabase
      .from("posts")
      .select(`
        id,
        content,
        created_at,
        profiles (
          full_name,
          username
        )
      `)
      .limit(10);

    console.log("[/api/admin/posts] inferred:", {
      error: inferred.error ? inferred.error.message : null,
      dataSample: inferred.data ? (Array.isArray(inferred.data) ? inferred.data.slice(0,2) : inferred.data) : null,
    });

    if (!inferred.error && Array.isArray(inferred.data)) {
      // success — return inferred result
      return res.status(200).json(inferred.data);
    }

    // 3) If inferred failed, try explicit constraint alias (use the FK constraint name)
    //    In your schema the FK constraint is `posts_author_id_fkey` referencing profiles(id).
    //    Adjust the constraint name if yours differs.
    console.log("[/api/admin/posts] STEP: explicit alias select (author:profiles!posts_author_id_fkey(...))");
    const explicit = await supabase
      .from("posts")
      .select(`
        id,
        content,
        created_at,
        author:profiles!posts_author_id_fkey (
          full_name,
          username
        )
      `)
      .limit(10);

    console.log("[/api/admin/posts] explicit:", {
      error: explicit.error ? explicit.error.message : null,
      dataSample: explicit.data ? (Array.isArray(explicit.data) ? explicit.data.slice(0,2) : explicit.data) : null,
    });

    if (!explicit.error && Array.isArray(explicit.data)) {
      return res.status(200).json(explicit.data);
    }

    // If we reach here, both relation attempts failed with errors
    const errMsg = inferred.error?.message || explicit.error?.message || "Unknown fetch error";
    console.error("[/api/admin/posts] Both relation selects failed:", { inferredErr: inferred.error, explicitErr: explicit.error });
    return res.status(500).json({
      stage: "relations_failed",
      error: errMsg,
      inferredError: inferred.error ? inferred.error.message : null,
      explicitError: explicit.error ? explicit.error.message : null,
      simpleSample: simple.data ?? null,
    });
  } catch (err: any) {
    console.error("[/api/admin/posts] Unhandled exception:", err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
}
