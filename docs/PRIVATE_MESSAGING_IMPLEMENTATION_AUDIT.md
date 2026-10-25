# Private Messaging Implementation Audit

**Date:** 2026-10-25  
**Branch:** `feat/p2p-first-messaging-foundation`  
**Audit basis:** Current files fetched from the repository's `main` branch. This is a source-level audit, not a local build or database inspection.

## Findings confirmed from source

### 1. The app already has a messaging UI

- `pages/messages.tsx` uses the Next.js Pages Router, Supabase Auth helpers, and `get_my_conversations_list` RPC to load conversation summaries.
- `components/messaging/ConversationList.tsx` displays `last_message.content` from the conversation summary.
- `components/messaging/ChatWindow.tsx` loads message rows from the `public.messages` table and subscribes to Postgres Changes for new message inserts.
- `pages/api/messages.ts` authenticates the current user and calls `find_or_create_conversation` to create/find a conversation.

### 2. Current message content is server-persisted

In `components/messaging/ChatWindow.tsx`, text is inserted into the Supabase `messages` table with `content: newMessage`. Existing message history is fetched with `.from('messages').select(...)`. The Realtime subscription receives message INSERT events.

**Impact:** current messaging is not end-to-end encrypted and does not meet the agreed no-persistent-message-content target. Moving to P2P requires a deliberate compatibility/history migration; simply adding a P2P connection would not remove this server persistence.

### 3. Current attachments are uploaded to Supabase Storage

In `components/messaging/ChatWindow.tsx`, attachments are uploaded to the `chat_media` bucket. The client then obtains a public URL with `getPublicUrl` and saves that URL in the message row.

**Impact:** this is incompatible with the agreed default. The existing bucket's actual public/private configuration and Storage RLS policies have not yet been inspected. Do not assume the bucket is public solely because `getPublicUrl` is called, but treat public URL generation as a risk requiring review.

### 4. Existing features that must be preserved

- Supabase Auth and authenticated conversation access.
- Conversation metadata and participant profiles.
- Existing identity, credential, and document verification workflows.

The messaging-specific plan must not silently migrate or delete credential-verification files, because they may have separate retention and compliance requirements.

### 5. Repository and runtime details

- Root `package.json` identifies a Next.js 14 Pages Router application with React 18 and `@supabase/supabase-js ^2.45.0`.
- The repository's `README.md` describes Supabase Postgres/Auth/Storage and additional event/graph infrastructure, but its setup instructions may be stale and do not prove which services are currently deployed.
- No local checkout, installed dependencies, running test suite, Supabase project connection, database schema, Storage policies, or Realtime authorization policies were available during this source-only audit. No build or test is claimed.

## Security-sensitive issue to investigate

`lib/supabaseClient.ts` exports both a browser-style Supabase client and a `supabaseAdmin` client constructed with `SUPABASE_SERVICE_ROLE_KEY` from the same module. This audit did not establish every import site or whether the admin export is bundled into client code. Trace all imports and separate privileged server-only code before further use; never expose a service-role/secret key to a browser bundle.

## Required next steps before replacing the existing messaging flow

1. Inspect all imports and uses of `ChatWindow`, `Message`, `ChatContext`, `supabaseAdmin`, and message/attachment fields.
2. Inspect the actual SQL migrations/schema for `messages`, conversations, RPC functions, RLS policies, and Storage bucket policies.
3. Confirm Realtime channel authorization before using Supabase Broadcast for transient WebRTC signaling.
4. Select and threat-model a mature end-to-end encryption protocol/library, including multi-device identity, key verification, device revocation, and history bootstrap. WebRTC DTLS alone is not a substitute for an authenticated E2EE protocol.
5. Implement direct P2P as an opt-in development path behind a feature flag until E2EE and signaling authorization are reviewed. Never claim the existing message flow is private while plaintext database persistence remains enabled.
6. Introduce IndexedDB only with a documented local encryption/key strategy. Browser-local persistence alone is not an E2EE guarantee.
7. Replace the Supabase Storage upload path only after the new attachment flow can transfer ciphertext safely and has tested failure/retry behavior. Do not silently fall back to server upload.

## Phase 1 implementation boundary

The first code increment should establish isolated, testable foundations (IndexedDB persistence for opaque encrypted envelopes and WebRTC DataChannel transport with no TURN servers configured). It must not claim to complete E2EE or silently switch the production chat UI away from the existing server-persisted behavior before the encryption and authorization layers are ready.


## Current implementation branch progress

The branch `feat/p2p-first-messaging-foundation` contains the first isolated foundations:

- `lib/messaging/localEncryptedEnvelopeStore.ts`: IndexedDB persistence for opaque ciphertext envelopes, with validation and conversation/time indexes. It deliberately does not encrypt; only a future reviewed E2EE layer should supply ciphertext.
- `lib/messaging/p2pDataChannel.ts`: WebRTC DataChannel transport for binary encrypted payloads, accepts STUN-only ICE configuration, rejects TURN URLs, and reports direct-connection failure instead of silently relaying.
- This audit document records the existing server-persisted message and Supabase Storage behavior that still needs migration.

**Not yet implemented:** production E2EE, peer/device authentication, authorized signaling adapter, chunked/resumable attachments, UI integration, optional cloud provider integration, multi-device key management/history sync, or migration of current plaintext messages and media. The existing chat UI intentionally remains unchanged in this first increment.

**Verification status:** source changes were committed to the feature branch, but a local checkout/build/test run could not be performed in this environment because GitHub network access was unavailable. Treat the code as unverified until CI or a local checkout passes type-check, lint, and tests. No production behavior is claimed to have changed.


## Additional repository checks

- `supabase/migrations/` currently lists only `20261025013441_professional_verification_invitations.sql`; it does not contain a messaging schema migration.
- `supabase/policies` is intentionally blank. The repository therefore does not provide the conversation membership RLS rules needed to safely authorize a private signaling channel. Do not invent policies against guessed table/column names; inspect the live schema or establish a committed source of truth first.
- No `.github/workflows/` directory was found at the repository root. Do not assume automated CI currently type-checks or tests this branch.
- `package.json` has Jest and ts-jest dependencies and a `test` script, but no Jest configuration was found at the root. Test execution setup should be checked before relying on the script.

## End-to-end encryption library gate

The application is a browser-based Next.js client. The official [Signal libsignal README](https://github.com/signalapp/libsignal) says the library is used by Signal clients and that use outside Signal is unsupported; its NPM TypeScript binding is distributed as a native Node add-on, not a browser build. Therefore it cannot be adopted blindly as a browser dependency.

Do not fall back to a hand-written crypto protocol or an unmaintained JavaScript port. Evaluate browser-compatible candidates for maintenance, threat model, independent audit status, license, supported multi-device behavior, and build compatibility. Record the decision and license review before adding the dependency. WebRTC DTLS protects the direct transport but does not, by itself, provide TrustedIn's required long-term identity verification, prekey/session protocol, key-change handling, or secure multi-device history bootstrap.


## Live Supabase project inspection (read-only)

The connected Supabase project `Trustedin Project` (`qgcarphlabblhyembnbd`) was inspected with read-only schema queries on 2026-10-25. No database writes were made.

- `public.messages` has `content text NOT NULL`, `media_url`, `media_type`, and `link_preview jsonb`. RLS is enabled.
- The current `messages` SELECT and INSERT policies restrict rows to conversations where `auth.uid()` appears in `public.conversation_participants`. `conversations` SELECT is similarly membership-scoped; `conversation_participants` SELECT only exposes the caller's own participant rows.
- `public.get_my_conversations_list()` is a `SECURITY DEFINER` SQL function and returns the last message's `content` in its JSON summary. Its query filters conversations by `auth.uid()`, but it still confirms that message plaintext is returned by the backend.
- The Supabase Storage bucket `chat_media` is configured with `public = true`. The existing client uploads attachments there and calls `getPublicUrl`. This means the current chat attachment path does not meet the planned private-storage policy. No attempt was made to change the bucket because doing so before migrating the UI could break existing attachment links.
- No RLS policies were returned for `realtime.messages` by the live policy query. A private Broadcast signaling channel therefore needs a deliberate membership-scoped authorization policy before it can be used. Supabase's current Realtime documentation recommends private channels and authorization policies on `realtime.messages`; see [Realtime Getting Started](https://supabase.com/docs/guides/realtime/getting_started) and [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization).
- The live database migration history includes more migrations than the repository's checked-in `supabase/migrations/` directory. This is migration drift: reconcile the migration history before adding/applying database changes. Do not apply schema changes directly to production from this draft.

### Operational warning

The existing `chat_media` bucket being public is a concrete privacy risk for chat attachments. It should be addressed as part of a coordinated attachment migration. Do not upload sensitive content to it under the assumption that its URLs are private. This audit did not enumerate or expose any stored objects and did not change production settings.
