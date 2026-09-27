# R2 Migration Plan — v0 Screenshot Caching

**Status:** Deferred — waiting on Cloudflare R2 subscription (requires payment card on file)
**Priority:** Medium — do before the app sees meaningful traffic
**Estimated effort:** 1 session (~30-45 min) once R2 is enabled

## Why R2 (vs Supabase Storage)

| Storage | Free tier | Egress cost | Notes |
|---|---|---|---|
| **Cloudflare R2** | 10 GB + 1M Class A ops + 10M Class B ops | **$0 (zero egress)** | Best fit for high-view public assets |
| **Supabase Storage** | 1 GB + 5 GB egress/month | $0.09/GB after 5 GB | Current choice until R2 available |
| **Vercel Blob** | 500 MB | $0.05/GB | Too small for screenshot use case |

Every feed card load serves a screenshot. Egress dominates cost at scale. R2's zero-egress
model means a viral Papo with 100k views costs nothing extra. Supabase Storage works for now
(5 GB egress/month ≈ ~100k screenshot views/month) but will hit limits as traffic grows.

## Architecture decision (target state)

Split assets by type:

- **User uploads** (avatars, banners, post media, verification docs) → **Supabase Storage**
  - Auth + RLS integration is a real win for user-owned data
- **System-generated public assets** (v0 screenshots, future OG images) → **Cloudflare R2**
  - Public by design, high egress, no auth needed

## Setup steps (once card is available)

### 1. Enable R2 on Cloudflare

1. Cloudflare dashboard → **R2** → **"Add R2 subscription to my account"** (free tier)
2. **Create bucket** named `papo-screenshots`
3. Bucket settings → **Public access** → enable **R2.dev subdomain**
   - Gives you a URL like `https://pub-<hash>.r2.dev`
4. **Manage R2 API Tokens** → **Create API Token**
   - Permissions: **Object Read & Write**
   - Scope: just the `papo-screenshots` bucket
   - TTL: forever (or 1 year)
5. Copy the four values:
   - Access Key ID
   - Secret Access Key (only shown once)
   - Account ID (from endpoint URL: `https://<account-id>.r2.cloudflarestorage.com`)
   - Public URL (the `pub-<hash>.r2.dev` hostname)

### 2. Add env vars to Vercel

All under Production + Preview + Development:

| Name | Type |
|---|---|
| `R2_ACCOUNT_ID` | Secret |
| `R2_ACCESS_KEY_ID` | Secret |
| `R2_SECRET_ACCESS_KEY` | Secret |
| `R2_BUCKET` | Config |
| `R2_PUBLIC_URL` | Config |

Also append the same five lines to local `.env.local`.

### 3. Install SDK

```powershell
npm install @aws-sdk/client-s3
git add package.json package-lock.json
git commit -m "chore(deps): add @aws-sdk/client-s3 for R2 integration"
git push