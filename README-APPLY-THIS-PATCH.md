# TrustedIn hardening + Trust Dossier review patch

## Included
- A private, authenticated Trust Dossier API (`pages/api/trust-report/[userId].ts`).
- A Trust Dossier UI that uses real profile, GitHub, verification, professional-history, skills and score-history records.
- Removal of GitHub OAuth token response logging.
- Didit session association with a stored provider session ID.
- Didit webhook signature verification, a five-minute timestamp window, exact session matching, and event idempotency.

## Production database changes already applied
The connected Supabase project has had RLS enabled on 16 previously unprotected public tables, owner/role-scoped policies added, protected profile fields guarded against self-escalation, and privileged RPC execution/search paths tightened. The live database also has `provider_session_id` and `provider_event_id` on `verification_submissions`, a nullable `document_url` for provider sessions, and a service-role-only `didit_webhook_events` table.

The application changes are on the `security/trust-dossier-hardening` branch for review. They have not been deployed to production and should not be merged until the checks below pass.

## Required configuration
Add `DIDIT_WEBHOOK_SECRET` to Vercel Production and Preview only after confirming the matching Didit destination's `secret_shared_key`. Do not paste the secret into chat or commit it.

## Important follow-up
The existing GitHub token is still stored in `github_profiles.token`. RLS now restricts that table to the owning authenticated user, and the dossier endpoint never selects the token, but the stronger long-term fix is to move the token into a non-exposed server-only credential store and update `/api/sync-github.ts` to use a service-role/server-side client. Also rotate the GitHub OAuth token if production logs may have captured the old token before logging was removed.

## Verification before deployment
1. Run lint, type-check, unit tests and production build.
2. Test unauthenticated dossier access (must return 401), cross-user access (403), and own dossier (200).
3. Test RLS for each of the 16 protected tables with anon, user A, user B, and an admin.
4. Confirm Didit's documented signature algorithm, canonical payload, and header names against the configured webhook before enabling this handler. Then use Didit's Try Webhook tool to verify valid signatures, invalid signatures, stale timestamps, duplicate event IDs, unknown session IDs, approved/declined/pending transitions and repeated deliveries.
5. Confirm the GitHub OAuth callback never logs token data.
6. Re-run Supabase security advisors and inspect Vercel logs after a preview deployment.

## Scoring source
The authoritative production score writer is `public.calculate_and_update_trust_score(uuid)`, called by the GitHub OAuth callback and sync flow. It stores a 0–1000 score: a 200-point baseline plus the connected GitHub follower/repository bonus, capped at 1000. The dossier displays the stored score and exposes its current inputs for transparency; this score is not a holistic measure of trustworthiness.
