/* Offline edition 19b5e497bff303e266e0c7cca9beb74c0630b4958c585bbfea529008461937c9. Generated from the complete build. */
const CACHE = "pnigeus-19b5e497bff303e266e0c7cca9beb74c0630b4958c585bbfea529008461937c9";
const EDITION = "19b5e497bff303e266e0c7cca9beb74c0630b4958c585bbfea529008461937c9";
const BASE = "/pnigeus/";
const FILES = ["/pnigeus/assets/main-Bznl6PjT.css","/pnigeus/assets/main-QzZ4oSXO.js","/pnigeus/assets/offline-Bo1n_7Gq.css","/pnigeus/assets/offline-CLMar2_Y.js","/pnigeus/assets/shapes-D19gtFRI.js","/pnigeus/assets/shapes-ph047G3t.css","/pnigeus/assets/timing-D6fd4X4I.js","/pnigeus/assets/timing-zSVyLjeA.css","/pnigeus/fonts/IBMPlex-OFL.txt","/pnigeus/fonts/IBMPlexSans-Regular.woff2","/pnigeus/fonts/IBMPlexSans-SemiBold.woff2","/pnigeus/fonts/NotoSerif-OFL.txt","/pnigeus/fonts/NotoSerif-Regular.ttf","/pnigeus/index.html","/pnigeus/shapes.html","/pnigeus/sources/hero-fig76.jpg","/pnigeus/sources/hero-schmidt-192.jpg","/pnigeus/timing.html"];
const INVENTORY = {"/pnigeus/assets/main-Bznl6PjT.css":{"bytes":1280,"sha256":"5873556065cfd9aaa724923fd1d6f20d6e871d0d5206c34f0460d95230db8f73","type":"text/css"},"/pnigeus/assets/main-QzZ4oSXO.js":{"bytes":13734,"sha256":"b8643bf68afbfd657071081831bee48f35972ff098d7add879a07d1224f11779","type":"text/javascript"},"/pnigeus/assets/offline-Bo1n_7Gq.css":{"bytes":10382,"sha256":"2aedb71c863ba693715597fe33ecad416e14ae5664783eb8cf25733714ae6e77","type":"text/css"},"/pnigeus/assets/offline-CLMar2_Y.js":{"bytes":31838,"sha256":"687ea56133230e1fd23bcec464bab292b062d0f6d6d2fea972c79b6c390ded8f","type":"text/javascript"},"/pnigeus/assets/shapes-D19gtFRI.js":{"bytes":54322,"sha256":"3379b7954865c2600da758e3b3e291f6895400e8de603aa55bdfbb2a2e631962","type":"text/javascript"},"/pnigeus/assets/shapes-ph047G3t.css":{"bytes":8078,"sha256":"29aa3f216f000da66891549607574964675d38e4914dad05dab50c13f21b369b","type":"text/css"},"/pnigeus/assets/timing-D6fd4X4I.js":{"bytes":28022,"sha256":"fa12c6de20f61782ef5f67063e0c232e0cc0871ea6bea8b6b341730d60734a64","type":"text/javascript"},"/pnigeus/assets/timing-zSVyLjeA.css":{"bytes":3888,"sha256":"966418915719d3e5baebde3502f969b97483b66c0b9fc9f6f75cfa437f401e4c","type":"text/css"},"/pnigeus/fonts/IBMPlex-OFL.txt":{"bytes":4456,"sha256":"7e6b2818edbd8f6a01ae80641cc8f16a51080d08fb4e532be3a0b6f74adb07da","type":"text/plain"},"/pnigeus/fonts/IBMPlexSans-Regular.woff2":{"bytes":63020,"sha256":"ba711a3085ff9f27440b6b9c4550cfc47c97bf36591d5da958b975bb3add8c1a","type":"font/woff2"},"/pnigeus/fonts/IBMPlexSans-SemiBold.woff2":{"bytes":67060,"sha256":"f78048030eab62e860efa39a0df79e2e5581bf122eb95b9bc42c0b8a4988d205","type":"font/woff2"},"/pnigeus/fonts/NotoSerif-OFL.txt":{"bytes":4396,"sha256":"cee9892f9f0cc8fe882c9e9537ee6a89621d86ee7ceaf70b02e2b2b1c25c061a","type":"text/plain"},"/pnigeus/fonts/NotoSerif-Regular.ttf":{"bytes":444064,"sha256":"5473d2e43bdd018ee124a4addba8091fd0a29894b121cbb741023af6549662b6","type":"font/ttf"},"/pnigeus/index.html":{"bytes":1732,"sha256":"20a33ef7a90ce896848361ed51aa8b1aa41fb98ea496952556c5dd3d6cdc9f13","type":"text/html"},"/pnigeus/shapes.html":{"bytes":1769,"sha256":"361b2e4db1d3e2444336d4326aabab0677d2f9b43fcaa624a379a1ab9f76dd79","type":"text/html"},"/pnigeus/sources/hero-fig76.jpg":{"bytes":115259,"sha256":"6bb3ec5db3a250a4d44895b51aa442f0de2800cc328e0d717b7177a4d58b6133","type":"image/jpeg"},"/pnigeus/sources/hero-schmidt-192.jpg":{"bytes":441836,"sha256":"b353ae798dfcf466b9a95d965adee39a9dbd179b4534a3b62f5b915916f9e10d","type":"image/jpeg"},"/pnigeus/timing.html":{"bytes":1819,"sha256":"5534bbe22f8c15a60d2808fb1e0436e229d156a57de578166a14600ef4489289","type":"text/html"}};
/** Shared by the page and generated worker. Limits apply to decoded bytes. */
const TRANSFER_LIMITS = { idleMs: 15000, totalMs: 180000 };

async function assetDigest(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifiedBytes(url, identity, options = {}) {
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

