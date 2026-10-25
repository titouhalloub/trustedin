import { saveEncryptedEnvelope } from '../localEncryptedEnvelopeStore';

describe('saveEncryptedEnvelope validation', () => {
  const validRecord = {
    id: 'envelope-1',
    conversationId: 'conversation-1',
    senderDeviceId: 'device-a',
    recipientDeviceId: 'device-b',
    ciphertext: new Uint8Array([1, 2, 3]).buffer,
    createdAt: Date.now(),
    direction: 'outgoing' as const,
  };

  it('rejects missing identifiers before accessing IndexedDB', async () => {
    await expect(saveEncryptedEnvelope({
      ...validRecord,
      id: '',
    })).rejects.toThrow(/identifiers are required/i);
  });

  it('rejects empty or non-ArrayBuffer ciphertext', async () => {
    await expect(saveEncryptedEnvelope({
      ...validRecord,
      ciphertext: new ArrayBuffer(0),
    })).rejects.toThrow(/non-empty ArrayBuffer/i);

    await expect(saveEncryptedEnvelope({
      ...validRecord,
      ciphertext: 'plaintext' as unknown as ArrayBuffer,
    })).rejects.toThrow(/non-empty ArrayBuffer/i);
  });

  it('rejects invalid timestamps before accessing IndexedDB', async () => {
    await expect(saveEncryptedEnvelope({
      ...validRecord,
      createdAt: 0,
    })).rejects.toThrow(/positive timestamp/i);
  });
});
