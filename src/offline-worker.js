/* Edition constants and shared verified-transfer functions precede this file. */
const damaged = new Set();
let filling = null;
let lastProgress = 0;

async function broadcast(data) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients)
    if (new URL(client.url).pathname.startsWith(BASE))
      client.postMessage({ ...data, edition: EDITION });
}
async function invalidate(url) {
  if (damaged.has(url)) return;
  damaged.add(url);
  await broadcast({ type: "PNIGEUS_INVALIDATED" });
}
async function valid(response, url) {
  if (!response?.ok) return false;
  // Retain the response URL/type as well as bytes, so navigation and MIME
  // metadata remain part of the edition.
  if (
    !response.url ||
    new URL(response.url).origin !== self.location.origin ||
    new URL(response.url).pathname !== url
  )
    return false;
  const type = response.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase();
  const allowed =
    INVENTORY[url].type === "text/javascript"
      ? ["text/javascript", "application/javascript"]
      : [INVENTORY[url].type];
  if (!allowed.includes(type)) return false;
  const reader = response.clone().body?.getReader();
  if (!reader) return false;
  const bytes = new Uint8Array(INVENTORY[url].bytes);
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (length + value.byteLength > bytes.byteLength) {
        void reader.cancel().catch(() => {});
        return false;
      }
      bytes.set(value, length);
      length += value.byteLength;
    }
    return length === bytes.byteLength && (await assetDigest(bytes)) === INVENTORY[url].sha256;
  } catch {
    return false;
  } finally {
    reader.releaseLock();
  }
}
async function inspect() {
  let verified = 0;
  const missing = [];
  // Inspection never creates an empty cache after eviction.
  for (const url of FILES) {
    if (await valid(await caches.match(url, { cacheName: CACHE }), url)) {
      verified++;
      damaged.delete(url);
    } else {
      missing.push(url);
      await invalidate(url);
    }
  }
  return {
    type: "PNIGEUS_EDITION",
    edition: EDITION,
    complete: verified === FILES.length,
    verified,
    total: FILES.length,
    missing,
  };
}
async function progress(phase, completed, received = 0, bytes = 0, force = false) {
  const now = Date.now();
  if (!force && now - lastProgress < 250) return;
  lastProgress = now;
  await broadcast({
    type: "PNIGEUS_PROGRESS",
    phase,
    completed,
    total: FILES.length,
    received,
    bytes,
  });
}
async function retrieve(url, onProgress, signal) {
  const { response } = await verifiedBytes(url, INVENTORY[url], {
    onProgress,
    signal,
    preserveResponse: true,
    cache: "no-store",
  });
  // Preserve the verified network response's URL, response type and decoding
  // metadata rather than synthesizing a different response after verification.
  if (!(await valid(response, url)))
    throw new Error("The file response metadata did not match this edition.");
  return response;
}
async function fill(phase) {
  const cache = await caches.open(CACHE);
  const controller = new AbortController();
  const deadline = setTimeout(
    () =>
      controller.abort(
        new Error("Saving the offline edition exceeded five minutes. Retry while online."),
      ),
    300000,
  );
  let next = 0;
  let completed = 0;
  let failure = null;
  const work = async () => {
    while (next < FILES.length && !controller.signal.aborted) {
      const url = FILES[next++];
      try {
        if (!(await valid(await cache.match(url), url))) {
          if (phase === "repair") await invalidate(url);
          const response = await retrieve(
            url,
            (received, bytes) => {
              void progress(phase, completed, received, bytes);
            },
            controller.signal,
          );
          await cache.put(url, response);
        }
        damaged.delete(url);
        completed++;
        await progress(phase, completed, 0, 0, true);
      } catch (error) {
        failure ??= error;
      }
    }
  };
  await progress(phase, 0, 0, 0, true);
  await Promise.all([work(), work()]);
  clearTimeout(deadline);
  failure ??= controller.signal.aborted ? controller.signal.reason : null;
  const result = await inspect();
  if (failure || !result.complete)
    throw failure ?? new Error("The complete edition could not be saved.");
  await broadcast({ type: "PNIGEUS_CHANGED" });
  return result;
}
self.addEventListener("install", (event) => {
  // Default waiting preserves existing tabs and their edition. Initial install
  // still activates normally; updates activate after the old clients close.
  event.waitUntil(fill("install"));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("pnigeus-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("message", (event) => {
  const port = event.ports[0];
  if (!port || !["PNIGEUS_INSPECT", "PNIGEUS_REPAIR"].includes(event.data?.type)) return;
  event.waitUntil(
    (async () => {
      try {
        if (event.data.type === "PNIGEUS_REPAIR") {
          if (event.data.edition !== EDITION)
            throw new Error(
              "This tab and the controlling worker belong to different editions. Save your reading and close all Pnigeus tabs before reopening.",
            );
          filling ??= fill("repair").finally(() => {
            filling = null;
          });
          await filling;
        }
        port.postMessage(await inspect());
      } catch (error) {
        port.postMessage({
          ...(await inspect()),
          error: error instanceof Error ? error.message : "The offline copy could not be saved.",
        });
      }
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(BASE)
  )
    return;
  const file = url.pathname === BASE ? `${BASE}index.html` : url.pathname;
  if (!FILES.includes(file)) return;
  // A controlled tab receives its own verified edition, even while another
  // edition waits. Network-first HTML could mix new documents with old assets.
  event.respondWith(
    (async () => {
      const saved = await caches.match(file, { cacheName: CACHE });
      if (await valid(saved, file)) return saved;
      await invalidate(file);
      try {
        const response = await retrieve(file);
        await (await caches.open(CACHE)).put(file, response.clone());
        damaged.delete(file);
        await broadcast({ type: "PNIGEUS_CHANGED" });
        return response;
      } catch {
        return new Response(
          "This edition's file is missing or damaged. Return to an open Pnigeus tab and save its reading; check and repair its offline copy while online, or close all Pnigeus tabs and reopen the current edition.",
          { status: 503, headers: { "Content-Type": "text/plain;charset=utf-8" } },
        );
      }
    })(),
  );
});
