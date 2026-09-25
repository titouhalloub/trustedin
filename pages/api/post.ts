import { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const supabase = createPagesServerClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.provider_token) {
    return res
      .status(401)
      .json({ message: "Unauthorized. Please log in with LinkedIn to post." });
  }

  const linkedinIdentity = session.user.identities?.find(
    (identity) => identity.provider === "linkedin_oidc"
  );

  if (!linkedinIdentity?.identity_id) {
    return res
      .status(403)
      .json({ message: "LinkedIn identity not found for this user." });
  }

  const accessToken = session.provider_token;
  const linkedinUserId = linkedinIdentity.identity_id;

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: "Post text is required" });
  }

  const linkedinApiUrl = "https://api.linkedin.com/v2/ugcPosts";

  const body: any = {
    author: `urn:li:person:${linkedinUserId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: text,
        },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  try {
    const response = await fetch(linkedinApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("LinkedIn Post API Error:", errorData);
      return res.status(response.status).json({
        message: "Failed to create post on LinkedIn",
        error: errorData,
      });
    }

    const postId = response.headers.get("x-restli-id");
    res.status(201).json({ message: "Post created successfully", postId });
  } catch (error) {
    console.error("Internal server error on post:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}