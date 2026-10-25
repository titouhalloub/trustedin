import {
  P2PSignal,
  validateP2PSignal,
  validateStunOnlyIceServers,
} from '../p2pDataChannel';

describe('validateP2PSignal', () => {
  it('accepts a valid offer description', () => {
    expect(() => validateP2PSignal({
      kind: 'description',
      description: { type: 'offer', sdp: 'v=0\\r\\n' },
    })).not.toThrow();
  });

  it('accepts an ICE candidate, including the empty end-of-candidates marker', () => {
    expect(() => validateP2PSignal({
      kind: 'candidate',
      candidate: { candidate: '' },
    })).not.toThrow();
  });

  it('rejects unsupported description types', () => {
    const signal = {
      kind: 'description',
      description: { type: 'rollback', sdp: '' },
    } as unknown as P2PSignal;

    expect(() => validateP2PSignal(signal)).toThrow(/session description/i);
  });

  it('rejects missing SDP and oversized SDP', () => {
    expect(() => validateP2PSignal({
      kind: 'description',
      description: { type: 'offer' },
    })).toThrow(/session description/i);

    expect(() => validateP2PSignal({
      kind: 'description',
      description: { type: 'offer', sdp: 'x'.repeat(64 * 1024 + 1) },
    })).toThrow(/oversized/i);
  });

  it('rejects oversized ICE candidates', () => {
    expect(() => validateP2PSignal({
      kind: 'candidate',
      candidate: { candidate: 'x'.repeat(4 * 1024 + 1) },
    })).toThrow(/ICE candidate/i);
  });

  it('rejects malformed and unknown signal kinds', () => {
    expect(() => validateP2PSignal(null as unknown as P2PSignal)).toThrow(/Invalid/i);
    expect(() => validateP2PSignal({ kind: 'unknown' } as unknown as P2PSignal)).toThrow(/Unsupported/i);
  });
});

describe('validateStunOnlyIceServers', () => {
  it('allows no ICE servers and STUN-only configuration', () => {
    expect(validateStunOnlyIceServers()).toEqual([]);
    expect(validateStunOnlyIceServers([{ urls: 'stun:stun.example.org:3478' }])).toEqual([
      { urls: 'stun:stun.example.org:3478' },
    ]);
  });

  it('rejects TURN and non-STUN URLs', () => {
    expect(() => validateStunOnlyIceServers([{ urls: 'turn:relay.example.org:3478' }])).toThrow(/TURN/i);
    expect(() => validateStunOnlyIceServers([{ urls: 'https://relay.example.org' }])).toThrow(/Only STUN/i);
  });

  it('rejects a TURN URL even when mixed into an array', () => {
    expect(() => validateStunOnlyIceServers([{
      urls: ['stun:stun.example.org:3478', 'turns:relay.example.org:5349'],
    }])).toThrow(/TURN/i);
  });
});


describe('P2PDataChannel outbound payload safety', () => {
  const originalPeerConnection = globalThis.RTCPeerConnection;

  let channel: {
    readyState: RTCDataChannelState;
    bufferedAmount: number;
    binaryType: string;
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    send: jest.Mock;
    close: jest.Mock;
  };
  let peer: {
    connectionState: RTCPeerConnectionState;
    onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null;
    onconnectionstatechange: (() => void) | null;
    ondatachannel: ((event: RTCDataChannelEvent) => void) | null;
    createDataChannel: jest.Mock;
    createOffer: jest.Mock;
    setLocalDescription: jest.Mock;
    close: jest.Mock;
  };

  beforeEach(() => {
    channel = {
      readyState: 'open',
      bufferedAmount: 0,
      binaryType: 'blob',
      onmessage: null,
      onerror: null,
      send: jest.fn(),
      close: jest.fn(),
    };
    peer = {
      connectionState: 'new',
      onicecandidate: null,
      onconnectionstatechange: null,
      ondatachannel: null,
      createDataChannel: jest.fn(() => channel as unknown as RTCDataChannel),
      createOffer: jest.fn(async () => ({ type: 'offer', sdp: 'v=0\\r\\n' })),
      setLocalDescription: jest.fn(async () => undefined),
      close: jest.fn(),
    };
    Object.defineProperty(globalThis, 'RTCPeerConnection', {
      configurable: true,
      writable: true,
      value: jest.fn(() => peer as unknown as RTCPeerConnection),
    });
  });

  afterEach(() => {
    if (originalPeerConnection) {
      Object.defineProperty(globalThis, 'RTCPeerConnection', {
        configurable: true,
        writable: true,
        value: originalPeerConnection,
      });
    } else {
      delete (globalThis as { RTCPeerConnection?: typeof RTCPeerConnection }).RTCPeerConnection;
    }
    jest.restoreAllMocks();
  });

  async function openTestChannel(): Promise<import('../p2pDataChannel').P2PDataChannel> {
    const { P2PDataChannel } = await import('../p2pDataChannel');
    const transport = new P2PDataChannel({
      sendSignal: jest.fn(async () => undefined),
      onEncryptedPayload: jest.fn(),
    });
    await transport.start();
    return transport;
  }

  it('sends only the selected Uint8Array view and copies its bytes', async () => {
    const transport = await openTestChannel();
    const backing = new Uint8Array([9, 1, 2, 3, 8]);
    const view = backing.subarray(1, 4);

    transport.sendEncryptedPayload(view);
    backing[1] = 99;

    expect(channel.send).toHaveBeenCalledTimes(1);
    const sent = channel.send.mock.calls[0][0] as Uint8Array;
    expect(Array.from(sent)).toEqual([1, 2, 3]);
    expect(sent.buffer).not.toBe(backing.buffer);
    transport.close();
  });

  it('rejects oversized payloads before calling the browser send API', async () => {
    const transport = await openTestChannel();

    expect(() => transport.sendEncryptedPayload(new Uint8Array(16 * 1024 + 1))).toThrow(/16 KiB/i);
    expect(channel.send).not.toHaveBeenCalled();
    transport.close();
  });

  it('rejects sends when the channel is not open', async () => {
    const transport = await openTestChannel();
    channel.readyState = 'connecting';

    expect(() => transport.sendEncryptedPayload(new Uint8Array([1]))).toThrow(/not connected/i);
    expect(channel.send).not.toHaveBeenCalled();
    transport.close();
  });
});
