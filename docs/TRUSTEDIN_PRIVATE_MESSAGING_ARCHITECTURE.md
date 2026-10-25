# TrustedIn Private Messaging, P2P, and User-Owned Storage Plan

**Status:** Architecture plan — approved direction, not an implementation claim  
**Scope:** Future private messaging, multi-device synchronization, and messaging attachment delivery  
**Repository:** [titouhalloub/trustedin](https://github.com/titouhalloub/trustedin)

## 1. Executive decision

TrustedIn should use a **peer-to-peer-first architecture** for private messages and messaging attachments. Each device keeps its own local copy of received history. Users may optionally connect a cloud storage account they control for encrypted attachment availability when peers are offline. TrustedIn must not silently upload content, and the default architecture must not persist message bodies, media, or document contents on TrustedIn infrastructure.

The product principle is:

> **Your identity belongs to you. Your content belongs to you. Your storage belongs to you.**

This is a target architecture, not a statement that these capabilities already exist in the repository. Inspect the current application and its authentication, database, storage, and deployment paths before implementation.

## 2. Decisions already agreed

1. **P2P is the default.** Attempt direct device-to-device transfer where possible.
2. **Cloud storage is optional and opt-in.** It is never a silent fallback.
3. **IndexedDB is local persistence for web clients.** It can hold local message records, encrypted attachment cache entries, and sync state. It is not a reliable sole backup because browser storage can be cleared or evicted.
4. **No CDN in the initial architecture.** Reconsider only as part of a deliberate, opt-in cloud-backed delivery design.
5. **No silent content relay.** Do not route message or attachment payloads through TURN or another relay under the strict P2P default. If direct connectivity fails, explain the failure and offer retry, waiting, or an explicitly authorized cloud option.
6. **End-to-end encryption is required.** Encrypt content on the sender's device before it leaves the device. Transport encryption alone is not sufficient.
7. **Minimal server-side metadata only.** Store only what is needed for accounts, device/key discovery, conversation coordination, and transfer negotiation. Minimize logs and retention.
8. **Multi-device independence is a goal.** Each linked device has its own cryptographic identity/key material and can operate without the primary phone being continuously online, subject to connectivity and persistence constraints.
9. **Existing credential/document verification is out of scope for this storage rule.** TrustedIn's existing identity/credential verification workflows may have different legal, security, and retention requirements. Do not change those workflows as a side effect of messaging work; assess them separately.

## 3. Goals and non-goals

### Goals

- Private one-to-one messaging and attachment transfer.
- Direct P2P delivery as the default.
- Local-first history and cache for each browser/device.
- Optional, user-authorized cloud storage for encrypted attachments and potentially encrypted backups/history in a later phase.
- Secure linking and revocation of companion devices.
- Explicit, understandable delivery status and fallback choices.
- Minimize TrustedIn-hosted content, bandwidth, storage cost, and exposure in a breach.
- Preserve existing TrustedIn identity, trust, and credential features.

### Non-goals for the first release

- Building a centralized message-body queue.
- Hosting persistent message/media/document content on TrustedIn servers.
- Silent TURN/content relay or automatic cloud fallback.
- CDN-backed media hosting by TrustedIn.
- Claiming WhatsApp-level maturity or implementing Signal Protocol-like cryptography from scratch.
- Replacing existing credential-verification storage without a separate review.

## 4. Target architecture

### 4.1 Client

The client is responsible for:

- Generating and protecting device keys.
- Encrypting message content and attachments before transfer/storage.
- Maintaining local message history and delivery state.
- Storing local records and encrypted cache entries in IndexedDB for web clients.
- Establishing P2P connections and transferring large files in chunks.
- Verifying attachment integrity before exposing downloaded content.
- Managing linked devices, device revocation, and key changes.
- Showing users whether a transfer is direct P2P or uses their explicitly selected cloud provider.

Treat local browser storage as sensitive. Use a carefully reviewed key-storage strategy, avoid storing raw long-term secrets unnecessarily, and provide clear behavior when browser data is cleared or a device is lost. IndexedDB data is not automatically safe merely because it is local.

### 4.2 TrustedIn coordination backend

The backend may handle:

- Account authentication and authorization.
- Public device identity keys and key-discovery records.
- Short-lived WebRTC signaling messages (offer/answer and ICE candidates).
- Conversation membership and the minimum coordination metadata needed by the product.
- Optional transfer negotiation/status metadata.

The backend must not persist message plaintext, attachment bytes, document contents, thumbnails, or content-decryption keys for this messaging feature. Signaling should be transient. Logs should not capture message payloads, access tokens, private keys, or unnecessary IP/relationship data. Metadata itself can reveal social relationships, so collect the minimum and define retention periods.

Use appropriate access controls and row-level security where applicable. Never expose privileged backend/service-role credentials to clients.

### 4.3 Direct P2P transport

Use WebRTC DataChannels as a candidate transport for browser-to-browser transfer. The implementation must:

- Authenticate the peer identity independently of the network connection.
- Bind device identity keys to trusted account/device records.
- Encrypt message and attachment content end-to-end.
- Transfer large files in bounded chunks with backpressure, progress, retry, and integrity verification.
- Handle interrupted sessions without silently changing transport.
- Avoid payload relay through TURN under the strict default policy. STUN may assist connectivity discovery; it does not itself store content.
- Explain when NAT/firewall restrictions prevent a direct connection and offer safe alternatives.

WebRTC's transport security is not a substitute for application-level identity verification and a reviewed end-to-end encryption design.

### 4.4 Local persistence with IndexedDB

Use IndexedDB for the web client’s local data, such as:

- Encrypted-at-rest local message records where practical.
- Conversation indexes and local UI state.
- Attachment cache entries and verified content hashes.
- Per-device sync cursors and pending local operations.
- Transfer resume metadata that contains no content secrets.

Define quotas, cache eviction behavior, schema migrations, and recovery when storage is unavailable. Do not promise permanent retention from browser storage. Provide export/backup options only after a separate encryption and recovery design is reviewed.

### 4.5 Optional user-owned cloud storage

Cloud storage is a separate, explicitly enabled feature. Candidate providers may include Google Drive, Microsoft OneDrive, Dropbox, and user-configured object storage such as Cloudflare R2 where the integration model fits.

Rules:

- Ask for explicit consent before connecting a provider or storing content.
- Request the narrowest supported OAuth permissions.
- Encrypt attachments on the user's device before upload.
- Keep decryption keys out of provider metadata, TrustedIn databases, URLs, and logs.
- Clearly disclose which provider stores the encrypted object and what metadata the provider may observe.
- Support disconnect/revoke and document what happens to already uploaded objects.
- Define object deletion, retention, link expiration, and shared-recipient access behavior.
- Never assume that a provider's ordinary sharing URL is private or that a cloud provider cannot access plaintext unless client-side encryption is correctly implemented.
- Never automatically use cloud storage just because P2P failed.

A cloud object may be used to let another linked device or an offline recipient retrieve ciphertext, but this requires a separate design for authorization, key distribution, expiry, revocation, and deletion. The first implementation may limit cloud support to encrypted attachments rather than message history.

### 4.6 CDN policy

A CDN is **not part of the first release**. A CDN accelerates delivery; it is not itself a storage policy. Cached content generally depends on an origin or object store and can persist according to cache rules. Revisit CDN delivery only if users opt into cloud-backed storage and the design includes encrypted objects, cache/retention rules, revocation, and deletion semantics. TrustedIn must not operate a default centralized media CDN under this plan.

## 5. Multi-device model

Each linked device should have its own identity keys and authorization record. Linking a device should authenticate the pairing flow (for example, with a QR-based challenge), verify the new device, and make key changes visible to the user.

The design must distinguish:

- **Device independence:** an already linked device can send/receive while another device is offline, if it has connectivity and valid credentials.
- **History synchronization:** a new device cannot magically obtain messages that exist only on another device. History needs an explicit secure transfer or encrypted backup/cloud mechanism.
- **Offline delivery:** without an online recipient device or a user-authorized persistence location, delivery must wait. A local sender copy can remain queued on the sender's device, but it cannot guarantee delivery if that device is unavailable.

Avoid claiming full multi-device sync until device discovery, key distribution, secure history bootstrap, state reconciliation, device removal, and recovery have been designed and tested.

### State synchronization

Keep message content local by default. Sync only the minimum required state between devices. For operations such as read status, archive state, or conversation settings, define a versioned event model and conflict rules. Consider end-to-end encrypted state events only if server-assisted synchronization becomes necessary; this is a later design decision and must not accidentally introduce server-side plaintext content queues.

## 6. Message and attachment lifecycle

### Direct P2P default

1. Sender composes a message or selects an attachment.
2. Client encrypts content locally and records the pending operation locally.
3. Clients discover/authenticate device keys and negotiate a direct connection using transient signaling.
4. The encrypted payload transfers directly in bounded chunks.
5. Recipient verifies integrity, decrypts locally, and stores its own local copy.
6. Sender and recipient update minimal delivery metadata.
7. If direct transfer fails, the UI offers retry, wait for the peer, or choose an already configured cloud option. It does not upload or relay automatically.

### Optional cloud attachment path

1. User explicitly chooses cloud-backed delivery and has connected a provider.
2. Client encrypts the attachment locally.
3. Client uploads ciphertext to the user's selected storage provider.
4. The message carries a protected reference and the recipient obtains the decryption key through the authenticated end-to-end messaging protocol—not from a public URL or unprotected server metadata.
5. Authorized recipient downloads ciphertext, verifies it, and decrypts locally.
6. Apply defined expiration/deletion behavior and explain that copies already downloaded by recipients cannot reliably be revoked.

The precise key-wrapping, link authorization, expiry, and deletion protocol must be designed and reviewed before implementing this flow.

## 7. Minimal metadata policy

Potentially necessary metadata, subject to a privacy review:

- Internal account and device identifiers.
- Public device keys and key version/fingerprint records.
- Conversation membership/authorization.
- Short-lived signaling data.
- Message or transfer identifiers and minimal status/timestamp fields if required by product behavior.
- Optional encrypted-object references and expiry metadata for user-authorized cloud transfers.

Do not store for the messaging feature:

- Message plaintext or message-body archives.
- Media/document bytes or thumbnails.
- Content-decryption keys or private identity keys.
- Full message content in logs, analytics, crash reports, or traces.

Avoid collecting precise IP/location and relationship metadata unless strictly required. Document every stored field, purpose, access policy, and retention period before shipping.

## 8. Security and privacy requirements

- Use a mature, independently reviewed end-to-end encryption protocol/library appropriate to the platform; do not invent a custom cryptographic protocol.
- Threat-model account takeover, malicious linked devices, key substitution, replay, duplicate delivery, compromised browsers, malicious files, and storage-provider compromise.
- Authenticate devices and bind public keys to accounts; notify users about new devices and key changes.
- Define device revocation and the consequences for future messages, cloud objects, and local copies.
- Protect OAuth tokens; request least-privilege scopes and support revocation.
- Use authenticated encryption and verify content hashes; a hash alone is not authentication.
- Validate file types and sizes, handle untrusted filenames, and avoid unsafe inline rendering of downloaded documents.
- Apply access controls, RLS where relevant, and short retention for transient signaling.
- Never claim that P2P means zero metadata exposure: peers can learn each other's network addresses, and coordination infrastructure may observe connection metadata.
- Never claim deletion can erase copies already downloaded, exported, screenshotted, or backed up by another user.

## 9. Implementation phases

### Phase 0 — Repository and threat-model audit

- Inspect current frontend/backend structure, auth, database schema, storage buckets, realtime/signaling, deployment, and existing upload workflows.
- Identify existing message/attachment functionality, if any; do not assume it exists.
- Separate messaging attachments from credential-verification documents.
- Document data flows, current persistence, sensitive fields, and migration risks.
- Produce a threat model and architecture decision records before selecting crypto libraries.

**Exit criteria:** current behavior and all content-storage paths are documented; scope boundaries are agreed; no existing feature is silently broken.

### Phase 1 — Local-first foundations

- Define message, conversation, device, and transfer data models.
- Implement IndexedDB persistence, schema migrations, local search/indexing as needed, and graceful storage failure.
- Define local encryption/key-storage behavior and backup limitations.
- Add tests for browser refresh, offline startup, quota/storage failure, and migration.

**Exit criteria:** local state survives ordinary reloads; storage eviction is handled honestly; secrets are not casually exposed in logs or client state.

### Phase 2 — Device identity and secure linking

- Implement per-device identity/key records and authenticated device linking.
- Add device listing, new-device notifications, key-change handling, and revocation.
- Define recovery and history bootstrap separately.

**Exit criteria:** a device cannot be added silently; revoked devices cannot authenticate future sessions; key changes are detectable and explained.

### Phase 3 — Direct P2P messaging and attachments

- Implement transient signaling and WebRTC DataChannels.
- Implement a reviewed E2EE message protocol and authenticated peer verification.
- Add chunked file transfer, progress, integrity verification, retries, and interruption recovery.
- Enforce no silent relay and no server content persistence.
- Test restrictive networks and clear user-facing failure behavior.

**Exit criteria:** direct transfers work across supported devices; server inspection shows no stored message/attachment payloads; failure does not trigger an unauthorized fallback.

### Phase 4 — Optional user-owned encrypted storage

- Start with one provider only after provider APIs, OAuth scopes, token handling, and platform restrictions are reviewed.
- Implement explicit consent, client-side encryption, upload/download, protected key distribution, expiry/deletion, disconnect, and revocation.
- Add provider failure and quota handling.
- Add other providers only behind a common, tested storage-provider interface.

**Exit criteria:** cloud use is visibly opt-in; uploaded objects are ciphertext; disconnect/revoke behavior is documented; P2P remains the default.

### Phase 5 — Multi-device synchronization

- Design secure message/history bootstrap for newly linked devices.
- Define per-device message delivery and acknowledgements.
- Add versioned state synchronization and deterministic conflict resolution.
- Decide which history, if any, may use optional user-owned encrypted storage.

**Exit criteria:** each device's supported behavior is documented; offline and new-device scenarios have end-to-end tests; no claim of full history sync exceeds actual capabilities.

### Phase 6 — Hardening and release

- Run security review, dependency audit, abuse testing, privacy/logging review, and recovery tests.
- Test large files, poor connectivity, browser storage eviction, revoked devices, provider outage, and malicious payloads.
- Publish a plain-language privacy and retention statement.
- Add observability that avoids content and secret collection.

**Exit criteria:** threat-model risks have owners and mitigations; tests cover critical security boundaries; privacy statements match actual behavior.

## 10. Acceptance checklist

- [ ] P2P is the default attachment and message transport.
- [ ] No silent cloud upload or content relay.
- [ ] Message and attachment content is end-to-end encrypted before leaving the sender device.
- [ ] TrustedIn backend does not persist messaging payloads or content keys.
- [ ] Signaling data is transient and logs are privacy-minimized.
- [ ] IndexedDB persistence handles reloads, schema upgrades, and storage failure.
- [ ] Users understand that local browser storage may be cleared or evicted.
- [ ] Failed P2P connection offers retry/wait/explicit cloud choice.
- [ ] Optional cloud provider permissions are least-privilege and revocable.
- [ ] Cloud objects are encrypted client-side and have defined expiry/deletion behavior.
- [ ] Linked devices have individual identities, visible linking, key-change handling, and revocation.
- [ ] Offline delivery and history sync limitations are accurately communicated.
- [ ] Existing credential/document verification flows remain unchanged unless separately reviewed.
- [ ] Automated tests and security review validate these properties before release.

## 11. Open questions to resolve during repository audit

These are intentionally not silently decided in this plan:

1. Which existing code paths currently store user uploads, and which are specifically credential-verification artifacts?
2. Is messaging already implemented, and if so, what is the current persistence and realtime design?
3. Which platforms must be supported first: web only, mobile web, installed PWA, or native clients?
4. Which mature E2EE protocol/library fits the actual client stack and multi-device requirements?
5. What is the minimal metadata retention period, and which product features truly require receipts/read state?
6. Which cloud provider should be the first optional integration?
7. Should optional cloud storage initially support attachments only, or also encrypted history backup?
8. What recovery experience is acceptable if a user loses every device and has not configured encrypted backup?

## 12. Reference material

Use current official documentation and security guidance during implementation; re-check it before choosing libraries or permissions.

- [WebRTC data channels](https://webrtc.org/getting-started/data-channels)
- [WebRTC peer connections and signaling](https://webrtc.org/getting-started/peer-connections)
- [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Signal Protocol documentation](https://signal.org/docs/)
- [Google Drive API OAuth scopes](https://developers.google.com/drive/api/guides/api-specific-auth)
- [Cloudflare: What is a CDN?](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/)

---

**Session handoff instruction:** In a future session, read this document first, then inspect the current repository and report what is implemented, missing, or conflicting with this plan. Do not start implementation until the repository audit identifies the real code paths and the threat model/security choices are recorded.
