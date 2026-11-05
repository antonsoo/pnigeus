/** Shared by the page and generated worker. Limits apply to decoded bytes. */
export const TRANSFER_LIMITS = { idleMs: 15000, totalMs: 180000 };

export async function assetDigest(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifiedBytes(url, identity, options = {}) {
  if (
    !identity ||
    !Number.isSafeInteger(identity.bytes) ||
    identity.bytes < 0 ||
    !/^[a-f0-9]{64}$/.test(identity.sha256)
  )
    throw new Error("This asset is not identified by the current edition.");
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  options.signal?.throwIfAborted();
  options.signal?.addEventListener("abort", abort, { once: true });
  const stop = (message) => controller.abort(new Error(message));
  const total = setTimeout(
    () => stop("The asset exceeded its three-minute transfer limit. Retry while online."),
    options.totalMs ?? TRANSFER_LIMITS.totalMs,
  );
  let idle;
  const active = () => {
    clearTimeout(idle);
    idle = setTimeout(
      () => stop("The asset stopped arriving for 15 seconds. Retry while online."),
      options.idleMs ?? TRANSFER_LIMITS.idleMs,
    );
  };
  let reader;
  try {
    active();
    const response = await fetch(url, {
      signal: controller.signal,
      cache: options.cache ?? "default",
    });
    if (!response.ok || !response.body)
      throw new Error("The reading asset could not be loaded. Retry while online.");
    reader = (options.preserveResponse ? response.clone() : response).body.getReader();
    const bytes = new Uint8Array(identity.bytes);
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength === 0) continue;
      active();
      if (received + value.byteLength > bytes.byteLength)
        throw new Error("The source drawing or font did not match this edition (too many bytes).");
      bytes.set(value, received);
      received += value.byteLength;
      options.onProgress?.(received, identity.bytes);
    }
    clearTimeout(idle);
    if (received !== identity.bytes || (await assetDigest(bytes)) !== identity.sha256)
      throw new Error(
        "The source drawing or font did not match this edition. Check and repair the offline copy while online.",
      );
    controller.signal.throwIfAborted();
    return { bytes, response };
  } catch (error) {
    void reader?.cancel().catch(() => {});
    controller.abort(error);
    throw controller.signal.reason ?? error;
  } finally {
    clearTimeout(idle);
    clearTimeout(total);
    options.signal?.removeEventListener("abort", abort);
    reader?.releaseLock();
  }
}
