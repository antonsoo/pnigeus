export interface AssetIdentity {
  bytes: number;
  sha256: string;
}
export interface TransferOptions {
  signal?: AbortSignal;
  preserveResponse?: boolean;
  cache?: RequestCache;
  onProgress?: (received: number, total: number) => void;
  idleMs?: number;
  totalMs?: number;
}
export const TRANSFER_LIMITS: { idleMs: number; totalMs: number };
export function assetDigest(bytes: Uint8Array<ArrayBuffer>): Promise<string>;
export function verifiedBytes(
  url: string,
  identity: AssetIdentity,
  options?: TransferOptions,
): Promise<{ bytes: Uint8Array<ArrayBuffer>; response: Response }>;
