/**
 * Chunk framing for large E2EE message/attachment payloads.
 *
 * Frames produced here contain plaintext content and metadata. The caller MUST
 * encrypt every frame with the reviewed E2EE protocol before sending or storing
 * it. On receipt, decrypt/authenticate the frame before passing it to the
 * assembler. Never send these frames directly to P2PDataChannel.
 *
 * This is an in-memory framing primitive, not a resumable transfer manager.
 */

const MAGIC = [0x54, 0x49, 0x4e, 0x46]; // "TINF"
const VERSION = 1;
const HEADER_BYTES = 67;
export const DEFAULT_TRANSFER_CHUNK_BYTES = 8 * 1024;
export const MAX_TRANSFER_BYTES = 100 * 1024 * 1024;
const MAX_TOTAL_IN_FLIGHT_TRANSFER_BYTES = 100 * 1024 * 1024;
export const MAX_TRANSFER_CHUNKS = 16_384;

export interface TransferChunkMetadata {
  transferId: string;
  index: number;
  totalChunks: number;
  totalBytes: number;
  chunkBytes: number;
}

export interface DecodedTransferChunk extends TransferChunkMetadata {
  digest: Uint8Array;
  bytes: Uint8Array;
}

interface TransferState {
  transferId: string;
  totalChunks: number;
  totalBytes: number;
  digest: Uint8Array;
  chunks: Map<number, Uint8Array>;
  receivedBytes: number;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string): Uint8Array {
  if (!/^[a-f0-9]{32}$/i.test(value)) {
    throw new Error('Invalid transfer identifier.');
  }
  const result = new Uint8Array(16);
  for (let i = 0; i < result.length; i += 1) {
    result[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  return result;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let i = 0; i < left.byteLength; i += 1) difference |= left[i] ^ right[i];
  return difference === 0;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto SHA-256 is unavailable in this environment.');
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', copy.buffer));
}

/** Create a random transfer ID suitable for correlating chunks inside E2EE frames. */
export function createTransferId(): string {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('A cryptographically secure random number generator is unavailable.');
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/**
 * Encode one chunk frame. Encrypt the returned bytes with the application E2EE
 * protocol before transmission. Header fields are authenticated only when the
 * caller encrypts/authenticates the complete frame.
 */
export function encodeTransferChunkFrame(
  metadata: Omit<TransferChunkMetadata, 'chunkBytes'> & { digest: Uint8Array },
  bytes: Uint8Array,
): ArrayBuffer {
  const transferId = hexToBytes(metadata.transferId);
  if (
    !Number.isInteger(metadata.index) ||
    !Number.isInteger(metadata.totalChunks) ||
    !Number.isInteger(metadata.totalBytes) ||
    metadata.totalChunks < 1 ||
    metadata.totalChunks > MAX_TRANSFER_CHUNKS ||
    metadata.index < 0 ||
    metadata.index >= metadata.totalChunks ||
    metadata.totalBytes < 1 ||
    metadata.totalBytes > MAX_TRANSFER_BYTES ||
    metadata.totalChunks !== Math.ceil(metadata.totalBytes / DEFAULT_TRANSFER_CHUNK_BYTES) ||
    bytes.byteLength < 1 ||
    bytes.byteLength > DEFAULT_TRANSFER_CHUNK_BYTES ||
    bytes.byteLength !== (metadata.index === metadata.totalChunks - 1
      ? metadata.totalBytes - metadata.index * DEFAULT_TRANSFER_CHUNK_BYTES
      : DEFAULT_TRANSFER_CHUNK_BYTES) ||
    metadata.digest.byteLength !== 32
  ) {
    throw new Error('Invalid encrypted-transfer chunk metadata.');
  }

  const frame = new Uint8Array(HEADER_BYTES + bytes.byteLength);
  frame.set(MAGIC, 0);
  frame[4] = VERSION;
  frame.set(transferId, 5);
  const view = new DataView(frame.buffer);
  view.setUint32(21, metadata.index, false);
  view.setUint32(25, metadata.totalChunks, false);
  view.setUint32(29, metadata.totalBytes, false);
  view.setUint16(33, bytes.byteLength, false);
  frame.set(metadata.digest, 35);
  frame.set(bytes, HEADER_BYTES);
  return frame.buffer;
}

/** Decode a frame only after the E2EE layer has authenticated and decrypted it. */
export function decodeTransferChunkFrame(frame: ArrayBuffer): DecodedTransferChunk {
  if (!(frame instanceof ArrayBuffer) || frame.byteLength < HEADER_BYTES + 1) {
    throw new Error('Invalid or truncated transfer chunk frame.');
  }
  const bytes = new Uint8Array(frame);
  if (!MAGIC.every((value, index) => bytes[index] === value) || bytes[4] !== VERSION) {
    throw new Error('Unsupported transfer chunk frame format.');
  }

  const view = new DataView(frame);
  const transferId = bytesToHex(bytes.subarray(5, 21));
  const index = view.getUint32(21, false);
  const totalChunks = view.getUint32(25, false);
  const totalBytes = view.getUint32(29, false);
  const chunkBytes = view.getUint16(33, false);
  const digest = bytes.slice(35, 67);
  const payload = bytes.slice(HEADER_BYTES);

  if (
    totalChunks < 1 ||
    totalChunks > MAX_TRANSFER_CHUNKS ||
    index >= totalChunks ||
    totalBytes < 1 ||
    totalBytes > MAX_TRANSFER_BYTES ||
    chunkBytes < 1 ||
    chunkBytes > DEFAULT_TRANSFER_CHUNK_BYTES ||
    payload.byteLength !== chunkBytes ||
    totalChunks !== Math.ceil(totalBytes / DEFAULT_TRANSFER_CHUNK_BYTES)
  ) {
    throw new Error('Invalid transfer chunk bounds.');
  }

  return { transferId, index, totalChunks, totalBytes, chunkBytes, digest, bytes: payload };
}

/** Split bytes into frames. Encrypt each returned frame before sending it. */
export async function createTransferChunkFrames(
  content: ArrayBuffer | Uint8Array,
  transferId = createTransferId(),
): Promise<ArrayBuffer[]> {
  const source = content instanceof ArrayBuffer
    ? new Uint8Array(content.slice(0))
    : new Uint8Array(content);
  if (source.byteLength < 1 || source.byteLength > MAX_TRANSFER_BYTES) {
    throw new Error('Transfer content must be between 1 byte and 100 MiB.');
  }

  const idBytes = hexToBytes(transferId);
  const normalizedId = bytesToHex(idBytes);
  const digest = await sha256(source);
  const totalChunks = Math.ceil(source.byteLength / DEFAULT_TRANSFER_CHUNK_BYTES);
  if (totalChunks > MAX_TRANSFER_CHUNKS) {
    throw new Error('Transfer exceeds the supported chunk count.');
  }

  const frames: ArrayBuffer[] = [];
  for (let index = 0; index < totalChunks; index += 1) {
    const start = index * DEFAULT_TRANSFER_CHUNK_BYTES;
    const chunk = source.slice(start, Math.min(start + DEFAULT_TRANSFER_CHUNK_BYTES, source.byteLength));
    frames.push(encodeTransferChunkFrame({
      transferId: normalizedId,
      index,
      totalChunks,
      totalBytes: source.byteLength,
      digest,
    }, chunk));
  }
  return frames;
}

/**
 * Reassemble authenticated/decrypted chunk frames in memory and verify the
 * complete content digest. This does not persist chunks or implement retries.
 */
export class EncryptedTransferAssembler {
  private readonly transfers = new Map<string, TransferState>();

  constructor(private readonly maxConcurrentTransfers = 3) {
    if (!Number.isInteger(maxConcurrentTransfers) || maxConcurrentTransfers < 1 || maxConcurrentTransfers > 16) {
      throw new Error('maxConcurrentTransfers must be between 1 and 16.');
    }
  }

  async addDecryptedFrame(frame: ArrayBuffer): Promise<{
    transferId: string;
    receivedChunks: number;
    totalChunks: number;
    complete: boolean;
    content?: ArrayBuffer;
  }> {
    const chunk = decodeTransferChunkFrame(frame);
    let state = this.transfers.get(chunk.transferId);

    if (!state) {
      if (this.transfers.size >= this.maxConcurrentTransfers) {
        throw new Error('Too many concurrent incoming transfers.');
      }
      const inFlightBytes = Array.from(this.transfers.values())
        .reduce((total, transfer) => total + transfer.totalBytes, 0);
      if (inFlightBytes + chunk.totalBytes > MAX_TOTAL_IN_FLIGHT_TRANSFER_BYTES) {
        throw new Error('Incoming transfers exceed the aggregate in-memory size limit.');
      }
      state = {
        transferId: chunk.transferId,
        totalChunks: chunk.totalChunks,
        totalBytes: chunk.totalBytes,
        digest: chunk.digest,
        chunks: new Map(),
        receivedBytes: 0,
      };
      this.transfers.set(chunk.transferId, state);
    }

    if (
      state.totalChunks !== chunk.totalChunks ||
      state.totalBytes !== chunk.totalBytes ||
      !equalBytes(state.digest, chunk.digest)
    ) {
      this.transfers.delete(chunk.transferId);
      throw new Error('Transfer metadata changed between chunks; transfer discarded.');
    }

    const existing = state.chunks.get(chunk.index);
    if (existing) {
      if (!equalBytes(existing, chunk.bytes)) {
        this.transfers.delete(chunk.transferId);
        throw new Error('Conflicting duplicate chunk; transfer discarded.');
      }
      return {
        transferId: chunk.transferId,
        receivedChunks: state.chunks.size,
        totalChunks: state.totalChunks,
        complete: false,
      };
    }

    const expectedChunkBytes = chunk.index === state.totalChunks - 1
      ? state.totalBytes - chunk.index * DEFAULT_TRANSFER_CHUNK_BYTES
      : DEFAULT_TRANSFER_CHUNK_BYTES;
    if (chunk.bytes.byteLength !== expectedChunkBytes) {
      this.transfers.delete(chunk.transferId);
      throw new Error('Chunk length does not match transfer bounds; transfer discarded.');
    }

    state.chunks.set(chunk.index, chunk.bytes);
    state.receivedBytes += chunk.bytes.byteLength;

    if (state.chunks.size !== state.totalChunks) {
      return {
        transferId: chunk.transferId,
        receivedChunks: state.chunks.size,
        totalChunks: state.totalChunks,
        complete: false,
      };
    }

    if (state.receivedBytes !== state.totalBytes) {
      this.transfers.delete(chunk.transferId);
      throw new Error('Assembled transfer length mismatch; transfer discarded.');
    }

    const assembled = new Uint8Array(state.totalBytes);
    for (let index = 0; index < state.totalChunks; index += 1) {
      const part = state.chunks.get(index);
      if (!part) throw new Error('Transfer is missing a chunk.');
      assembled.set(part, index * DEFAULT_TRANSFER_CHUNK_BYTES);
    }

    const actualDigest = await sha256(assembled);
    this.transfers.delete(chunk.transferId);
    if (!equalBytes(actualDigest, state.digest)) {
      throw new Error('Transfer digest verification failed.');
    }

    return {
      transferId: chunk.transferId,
      receivedChunks: state.totalChunks,
      totalChunks: state.totalChunks,
      complete: true,
      content: assembled.buffer,
    };
  }

  discard(transferId: string): void {
    this.transfers.delete(transferId);
  }

  clear(): void {
    this.transfers.clear();
  }
}
