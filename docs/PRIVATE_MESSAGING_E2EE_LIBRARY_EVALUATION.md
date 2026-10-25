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
