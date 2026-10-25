/**
 * Direct WebRTC DataChannel transport for already-encrypted messaging payloads.
 *
 * This module deliberately configures no TURN server and rejects TURN URLs.
 * It does not implement end-to-end encryption, peer authentication, signaling
 * authorization, chunked file transfer, or offline delivery. Those layers must
 * be supplied and reviewed before connecting this transport to production chat.
 */

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

function assertStunOnly(servers: RTCIceServer[] = []): RTCIceServer[] {
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
      iceServers: assertStunOnly(options.iceServers),
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

    if (signal.kind === 'candidate') {
      if (this.peer.remoteDescription) {
        await this.peer.addIceCandidate(signal.candidate);
      } else {
        this.pendingCandidates.push(signal.candidate);
      }
      return;
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
    this.channel.send(ciphertext);
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
      if (event.data instanceof ArrayBuffer) {
        this.options.onEncryptedPayload(event.data);
      } else {
        this.options.onError?.(new Error('Unexpected non-binary payload on encrypted data channel.'));
      }
    };
    channel.onerror = () => {
      this.options.onError?.(new Error('P2P data channel error.'));
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
