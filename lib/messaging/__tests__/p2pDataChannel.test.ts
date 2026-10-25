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
