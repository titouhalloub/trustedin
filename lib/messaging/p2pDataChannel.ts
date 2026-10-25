/**
 * Direct WebRTC DataChannel transport for already-encrypted messaging payloads.
 *
 * This module deliberately configures no TURN server and rejects TURN URLs.
 * It does not implement end-to-end encryption, peer authentication, signaling
 * authorization, chunked file transfer, or offline delivery. Those layers must
 * be supplied and reviewed before connecting this transport to production chat.
 */

const MAX_ENCRYPTED_PAYLOAD_BYTES = 16 * 1024;
const MAX_SIGNAL_SDP_BYTES = 64 * 1024;
const MAX_ICE_CANDIDATE_BYTES = 4 * 1024;
const MAX_PENDING_ICE_CANDIDATES = 256;
const MAX_BUFFERED_BYTES = 1024 * 1024;

export type P2PSignal =
  | { kind: 'description'; description: RTCSessionDescriptionInit }
  | { kind: 'candidate'; candidate: RTCIceCandidateInit };

export interface P2PDataChannelOptions {
  /** Caller must verify that signaling came from an authorized conversation peer. */
  sendSignal: (signal: P2PSignal) => void | Promise<void>;
  onEncryptedPayload: (payload: ArrayBuffer) => void;
  onStateChange?: (state: RTCPeerConnectionState) => void;
  onError?: (error: Error) => void;
  /** STUN servers only. TURN is rejected to preserve the strict direct-P2P policy. */
  iceServers?: RTCIceServer[];
}

export function validateP2PSignal(signal: P2PSignal): void {
  if (!signal || typeof signal !== 'object') {
    throw new Error('Invalid P2P signaling payload.');
  }

  if (signal.kind === 'description') {
    const description = signal.description;
    if (
      !description ||
      !['offer', 'answer'].includes(description.type ?? '') ||
      typeof description.sdp !== 'string' ||
      description.sdp.length === 0 ||
      description.sdp.length > MAX_SIGNAL_SDP_BYTES
    ) {
      throw new Error('Invalid or oversized WebRTC session description.');
    }
    return;
  }

  if (signal.kind === 'candidate') {
    const candidate = signal.candidate;
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      typeof candidate.candidate !== 'string' ||
      candidate.candidate.length > MAX_ICE_CANDIDATE_BYTES
    ) {
      throw new Error('Invalid or oversized ICE candidate.');
    }
    return;
  }

  throw new Error('Unsupported P2P signaling message kind.');
}

export function validateStunOnlyIceServers(servers: RTCIceServer[] = []): RTCIceServer[] {
  for (const server of servers) {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    for (const url of urls) {
      if (/^turns?:/i.test(url)) {
        throw new Error('TURN servers are disabled by TrustedIn strict P2P policy.');
      }
      if (!/^stun:/i.test(url)) {
        throw new Error('Only STUN ICE servers are allowed by TrustedIn strict P2P policy.');
      }
    }
  }
  return servers;
}

export class P2PDataChannel {
  private readonly peer: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private readonly pendingCandidates: RTCIceCandidateInit[] = [];
  private closed = false;

  constructor(private readonly options: P2PDataChannelOptions) {
    if (typeof RTCPeerConnection === 'undefined') {
      throw new Error('WebRTC is not available in this browser.');
    }

    this.peer = new RTCPeerConnection({
      iceServers: validateStunOnlyIceServers(options.iceServers),
    });

    this.peer.onicecandidate = (event) => {
      if (!event.candidate || this.closed) return;
      // ICE callbacks are event-driven; prevent rejected signaling promises from becoming unhandled.
      void this.emitSignal({ kind: 'candidate', candidate: event.candidate.toJSON() }).catch(() => undefined);
    };

    this.peer.onconnectionstatechange = () => {
      this.options.onStateChange?.(this.peer.connectionState);
      if (this.peer.connectionState === 'failed') {
        this.options.onError?.(new Error(
          'Direct P2P connection failed. TrustedIn will not silently relay content.',
        ));
      }
    };

    this.peer.ondatachannel = (event) => this.attachChannel(event.channel);
  }

  /** Call on exactly one side to initiate a connection. */
  async start(): Promise<void> {
    this.ensureOpen();
    if (this.channel) throw new Error('The P2P data channel has already been started.');

    this.attachChannel(this.peer.createDataChannel('trustedin-encrypted-payloads', {
      ordered: true,
    }));

    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    await this.emitSignal({ kind: 'description', description: offer });
  }

  /**
   * Apply a signal received from the other participant.
   * The caller must authorize the sender and bind it to the expected device
   * identity before passing any signal here.
   */
  async handleSignal(signal: P2PSignal): Promise<void> {
    this.ensureOpen();
    validateP2PSignal(signal);

    if (signal.kind === 'candidate') {
      if (this.peer.remoteDescription) {
        await this.peer.addIceCandidate(signal.candidate);
      } else {
        if (this.pendingCandidates.length >= MAX_PENDING_ICE_CANDIDATES) {
          throw new Error('Too many ICE candidates arrived before the remote description.');
        }
        this.pendingCandidates.push(signal.candidate);
      }
      return;
    }

    // Reject duplicate/replayed descriptions and offer glare rather than
    // allowing arbitrary signaling to drive implicit renegotiation.
    if (signal.description.type === 'offer' && this.peer.signalingState !== 'stable') {
      throw new Error('Unexpected WebRTC offer for the current signaling state.');
    }
    if (signal.description.type === 'answer' && this.peer.signalingState !== 'have-local-offer') {
      throw new Error('Unexpected WebRTC answer; no local offer is awaiting it.');
    }

    await this.peer.setRemoteDescription(signal.description);
    await this.flushCandidates();

    if (signal.description.type === 'offer') {
      const answer = await this.peer.createAnswer();
      await this.peer.setLocalDescription(answer);
      await this.emitSignal({ kind: 'description', description: answer });
    }
  }

  /** Send bytes that have already been encrypted by the application E2EE layer. */
  sendEncryptedPayload(ciphertext: ArrayBuffer | Uint8Array): void {
    this.ensureOpen();
    if (!this.channel || this.channel.readyState !== 'open') {
      throw new Error('Direct P2P channel is not connected. Retry or wait for the peer.');
    }
    if (ciphertext.byteLength === 0) {
      throw new Error('Cannot send an empty encrypted payload.');
    }
    if (ciphertext.byteLength > MAX_ENCRYPTED_PAYLOAD_BYTES) {
      throw new Error('Encrypted payload exceeds 16 KiB. Chunked attachment transfer is not implemented yet.');
    }
    if (this.channel.bufferedAmount + ciphertext.byteLength > MAX_BUFFERED_BYTES) {
      throw new Error('P2P send buffer is full. Retry after the channel drains.');
    }
    // Normalize to a fresh ArrayBuffer-backed view. This also prevents the caller
    // from mutating a Uint8Array's backing buffer while the browser queues it.
    const payload = new Uint8Array(ciphertext.byteLength);
    if (ciphertext instanceof ArrayBuffer) {
      payload.set(new Uint8Array(ciphertext));
    } else {
      payload.set(ciphertext);
    }
    this.channel.send(payload);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.channel?.close();
    this.peer.close();
  }

  private attachChannel(channel: RTCDataChannel): void {
    this.channel = channel;
    channel.binaryType = 'arraybuffer';
    channel.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      if (!(event.data instanceof ArrayBuffer)) {
        this.options.onError?.(new Error('Unexpected non-binary payload on encrypted data channel.'));
        return;
      }
      if (event.data.byteLength === 0 || event.data.byteLength > MAX_ENCRYPTED_PAYLOAD_BYTES) {
        this.options.onError?.(new Error('Rejected empty or oversized inbound P2P payload.'));
        return;
      }

      try {
        this.options.onEncryptedPayload(event.data);
      } catch (cause) {
        const error = cause instanceof Error
          ? cause
          : new Error('Failed to process inbound encrypted P2P payload.');
        this.options.onError?.(error);
      }
    };
    channel.onerror = () => {
      this.options.onError?.(new Error('P2P data channel error.'));
    };
    channel.onclose = () => {
      if (!this.closed) {
        this.options.onError?.(new Error('Direct P2P data channel closed. No relay fallback was attempted.'));
      }
    };
  }

  private async flushCandidates(): Promise<void> {
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) await this.peer.addIceCandidate(candidate);
    }
  }

  private async emitSignal(signal: P2PSignal): Promise<void> {
    try {
      await this.options.sendSignal(signal);
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error('Failed to send P2P signaling message.');
      this.options.onError?.(error);
      throw error;
    }
  }

  private ensureOpen(): void {
    if (this.closed) throw new Error('P2P data channel is closed.');
  }
}
