# E2EE Library Evaluation — Decision Gate

**Status:** Candidate identified; **not approved for production adoption**  
**Reviewed:** 2026-10-25  
**Application:** TrustedIn browser-based Next.js 14 / React 18 client

## Decision

Do not hand-roll a messaging protocol and do not add an E2EE dependency until the application integration, key custody, protocol profile, and supply-chain risks have been reviewed. The current shortlist candidate is `@open-e2ee/signal-protocol-sdk` because its upstream repository currently declares browser support and a permissive dual license. This is a candidate for a sandbox spike, not a security endorsement.

## Evidence checked

- Upstream repository: https://github.com/open-e2ee/signal-protocol-js
- Upstream package manifest: https://github.com/open-e2ee/signal-protocol-js/blob/main/package.json
- Upstream security model: https://github.com/open-e2ee/signal-protocol-js/blob/main/docs/SECURITY.md
- Upstream security policy: https://github.com/open-e2ee/signal-protocol-js/blob/main/SECURITY.md
- Upstream browser setup: https://docs.open-e2ee.dev/start/browser

The repository's current package manifest reports version `13.2.0`, a browser export condition, and license `MIT OR Apache-2.0`. The security policy says only the newest `13.2.x` line is supported. The project documents a Signal-specification-based profile, but explicitly says it is **not wire-compatible with Signal Messenger or libsignal**.

## Risks and constraints

1. **No independent audit established.** The upstream project documentation is not a substitute for an independent cryptographic audit. Do not claim the library is independently audited.
2. **Not canonical Signal compatibility.** TrustedIn must describe it as the OpenE2EE protocol profile, not claim interoperability with Signal Messenger.
3. **Browser-origin boundary.** Upstream documentation states that same-origin JavaScript can access browser-stored records and keys. XSS, malicious dependencies, or compromised application code remain capable of compromising the local trust boundary.
4. **Key storage is not solved by installing the SDK.** The selected browser adapter, IndexedDB/OPFS support, encryption-at-rest declaration, key custody, backup, reset, and device revocation behavior need an explicit design and test.
5. **Relay is not required by the target architecture.** Upstream supports a hosted relay and custom delivery adapters. TrustedIn must not enable a hosted relay or persist content on a third-party service by accident. We need to confirm that the selected client APIs support our no-content-relay / direct-P2P-first transport model before adopting it.
6. **Version pinning.** If the candidate passes the spike, pin an exact reviewed package version and commit the lockfile. Do not use a floating range for cryptographic protocol code.
7. **Protocol and application review.** Inspect device identity enrollment, first-contact trust, identity changes, multi-device semantics, prekey lifecycle, message replay behavior, encrypted attachment APIs, storage adapter guarantees, and the documented deviations from Signal specifications.

## Required sandbox spike before dependency adoption

- [ ] Install the exact reviewed version on a separate branch and inspect the packed npm artifact, exports, dependency tree, provenance, and license files.
- [ ] Build the actual Next.js browser bundle; verify no Node-only modules or secret-bearing server code enter the client bundle.
- [ ] Create two independent browser profiles and exercise device registration, first contact, identity verification, session establishment, encrypt/decrypt, replay/reordering, and key-change handling.
- [ ] Test browser persistence and recovery with the selected store; document that same-origin compromise can expose keys.
- [ ] Demonstrate a custom delivery adapter that sends only the opaque encrypted envelope and required minimum signaling metadata; do not enable any hosted relay.
- [ ] Verify that all WebRTC signaling is authorized against the actual conversation membership schema and that payloads are not persisted in Postgres or logs.
- [ ] Review attachment encryption, chunking, integrity verification, and retry behavior separately from message encryption.
- [ ] Record an independent security review plan and explicit residual risks before any production rollout.

## Why this is not yet a final selection

The candidate is recent and its protocol/security surface is substantial. Upstream claims and repository tests are useful evidence but cannot independently establish security. TrustedIn's architecture also requires strict direct-P2P defaults and no silent content relay, so compatibility with the SDK's delivery model must be proven in a working spike. Until those gates pass, keep the current chat unchanged and do not label the product end-to-end encrypted.


## Sandbox integration findings (2026-10-25)

The upstream source and documentation were inspected for the current main revision; this was a source-level compatibility review, not a runnable browser spike and not an independent cryptographic audit.

### Browser persistence options

The SDK documents two browser stores:

- `@open-e2ee/signal-protocol-sdk/local/store/web` uses IndexedDB and Web Crypto. Its documented design encrypts records with AES-256-GCM, but keeps the record-encryption key in IndexedDB on the same origin. The SDK explicitly classifies that as co-located custody: it helps protect a copied database without the key, but it does not protect against XSS or compromised same-origin JavaScript.
- `@open-e2ee/signal-protocol-sdk/local/store/web-sqlite` uses SQLite/WASM in OPFS and a key held in an IndexedDB vault. It requires browser OPFS support and a Content Security Policy permitting `'wasm-unsafe-eval'`. This creates additional deployment and browser-compatibility gates for the current Next.js application.

Neither adapter eliminates the need for TrustedIn's CSP, dependency/XSS controls, account-reset behavior, and explicit recovery policy. The existing local envelope store is not a replacement for the SDK's atomic ratchet-state store; those stores have different responsibilities.

### Delivery architecture compatibility

The public SignalProtocolRelayServer contract includes device registration/listing, identity-key provisioning/rotation, prekey upload/fetch and inventory, envelope send/subscription/acknowledgement, and group-related operations. It is an application-owned integration surface, not a small callback that can simply be pointed at the current WebRTC DataChannel.

The SDK defines delivery classes including `ephemeral`, so an online-only envelope path may be possible. However, this does not prove that the SDK can meet TrustedIn's strict no-content-relay policy without a custom transport that delivers the envelope directly through the authenticated P2P connection. The actual call path, retries, acknowledgement semantics, recipient device fan-out, and behavior when a recipient is offline must be tested. Do not use the hosted OpenE2EE relay as a default or silently persist ciphertext on TrustedIn infrastructure.

### Current decision

**Do not install the SDK into the production dependency graph yet.** Continue with a separate sandbox branch/spike that pins an exact package version and demonstrates:

1. Browser bundle compatibility with this repository's Next.js 14 / React 18 build.
2. Two independent device stores and a complete encrypt → direct transfer → decrypt round trip.
3. A custom relay/transport adapter that uses authenticated account/device metadata for prekeys and identity, while sending message envelopes only over a live direct P2P channel.
4. Explicit behavior for offline recipients: wait/retry only, unless the user opts into a separately designed encrypted cloud-storage path.
5. Atomic protocol-store persistence, identity verification, key changes, replay/reordering, device revocation, and recovery tests.
6. A documented CSP and a decision between the IndexedDB store and OPFS/WASM store.

If the SDK's protocol delivery contract cannot be adapted to direct P2P without persistent message-envelope delivery, reject it for this product requirement rather than weakening the no-relay policy. A custom relay implementation is security-critical and must be reviewed; do not stub security-sensitive methods as no-ops just to make the SDK compile.
