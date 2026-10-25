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
