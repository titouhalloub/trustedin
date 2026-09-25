import { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import formidable from "formidable";
import fs from "fs/promises";

export const config = { api: { bodyParser: false } };

const parseForm = (req: NextApiRequest) =>
  new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    const form = formidable({});
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  try {
    const supabase = createPagesServerClient({ req, res });

    await supabase.auth.refreshSession();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return res.status(401).json({ message: "Unauthorized. Please log in." });

    const linkedinIdentity = session.user.identities?.find(i => i.provider === "linkedin_oidc");
    if (!linkedinIdentity) return res.status(403).json({ message: "LinkedIn identity not found" });

    const accessToken = session.provider_token;
    if (!accessToken) return res.status(401).json({ message: "No LinkedIn access token found" });

    const authorUrn = `urn:li:person:${linkedinIdentity.identity_id}`;

    const { fields, files } = await parseForm(req);
    const text = Array.isArray(fields.text) ? fields.text[0] : fields.text;
    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;

    if (!text || !imageFile) return res.status(400).json({ message: "Image and text are required." });

    // Register image upload
    const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: authorUrn,
          serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
        },
      }),
    });

    if (!registerRes.ok) throw new Error(`LinkedIn register upload failed: ${await registerRes.text()}`);
    const registerData = await registerRes.json();
    const uploadUrl =
      registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
    const assetUrn = registerData.value.asset;

    // Upload image binary
    const imageBuffer = await fs.readFile(imageFile.filepath);
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": imageFile.mimetype || "image/png" },
      body: imageBuffer as any,
    });
    if (!uploadRes.ok) throw new Error(`LinkedIn image upload failed: ${await uploadRes.text()}`);

    // Create post
    const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text },
            shareMediaCategory: "IMAGE",
            media: [{ status: "READY", media: assetUrn }],
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    if (!postRes.ok) throw new Error(`LinkedIn post creation failed: ${await postRes.text()}`);

    res.status(201).json({ message: "Post created successfully" });
  } catch (error: any) {
    console.error("Error sharing image to LinkedIn:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
}
