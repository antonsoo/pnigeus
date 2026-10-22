/* Offline edition 02363524c4e953e9e08b8c2f874791778baf7bab30a1f918c21a4525725bcf3c. Generated from the complete build. */
const CACHE = "pnigeus-02363524c4e953e9e08b8c2f874791778baf7bab30a1f918c21a4525725bcf3c";
const EDITION = "02363524c4e953e9e08b8c2f874791778baf7bab30a1f918c21a4525725bcf3c";
const BASE = "/pnigeus/";
const FILES = ["/pnigeus/assets/main-BlPueDQw.js","/pnigeus/assets/main-Bznl6PjT.css","/pnigeus/assets/offline-B0CFMBie.js","/pnigeus/assets/offline-C9A2EXqx.css","/pnigeus/assets/shapes-DiOAloMA.js","/pnigeus/assets/shapes-ph047G3t.css","/pnigeus/fonts/IBMPlex-OFL.txt","/pnigeus/fonts/IBMPlexSans-Regular.woff2","/pnigeus/fonts/IBMPlexSans-SemiBold.woff2","/pnigeus/fonts/NotoSerif-OFL.txt","/pnigeus/fonts/NotoSerif-Regular.ttf","/pnigeus/index.html","/pnigeus/shapes.html","/pnigeus/sources/hero-fig76.jpg","/pnigeus/sources/hero-schmidt-192.jpg"];
const INTEGRITY = {"/pnigeus/assets/main-BlPueDQw.js":"sha256-rRuhgoVL5mr5Zb8pdK0yga3NxGQoM1jdCWMHHZxgpkk=","/pnigeus/assets/main-Bznl6PjT.css":"sha256-WHNVYGXP2aqnJJI/0dbyDW6HHQ1SBsNPBGDZUjDbj3M=","/pnigeus/assets/offline-B0CFMBie.js":"sha256-gS87CTp9zESHwqoQBCkf75hj/nYm5dZPIP8GqujIemg=","/pnigeus/assets/offline-C9A2EXqx.css":"sha256-TRsGi2/nYKAqhFJZW04Dsz4VlQ9OigmMYl3hwVt1ZyU=","/pnigeus/assets/shapes-DiOAloMA.js":"sha256-i51xt/KTqOBk6DYb6JCHC6ZkLgPlnBdBB/E1SgQetD8=","/pnigeus/assets/shapes-ph047G3t.css":"sha256-Kao/IW8ADaZokVSWB1dJZGddOOSRTa0F2rUME/IbNps=","/pnigeus/fonts/IBMPlex-OFL.txt":"sha256-fmsoGO29j2oBroBkHMjxalEIDQj7TlMr46C290rbB9o=","/pnigeus/fonts/IBMPlexSans-Regular.woff2":"sha256-unEaMIX/nydEC2ucRVDPxHyXvzZZHV2pWLl1uzrdjBo=","/pnigeus/fonts/IBMPlexSans-SemiBold.woff2":"sha256-94BIAw6rYuhg76OaDfeeLlWBvxIuuVubxCwLikmI0gU=","/pnigeus/fonts/NotoSerif-OFL.txt":"sha256-zumJL58MyP6ILJ6VN+5qiWIdhu586vcLAuKyscJcBho=","/pnigeus/fonts/NotoSerif-Regular.ttf":"sha256-VHPS5DvdAY7hJKSt26gJH9CimJSxIcu3QQI69lSWYrY=","/pnigeus/index.html":"sha256-WFAAj9wJLRcKVvQCsBYVnbPUzP9riWY8uSdRs767QQk=","/pnigeus/shapes.html":"sha256-hhcRGidRybrkHmxMJPmYY3Cy+zcFVMqaroEwQTiMTq0=","/pnigeus/sources/hero-fig76.jpg":"sha256-a7PsXbOiUKTUSJW1GqRC8N4oAMwyjg1xe3F3pNWLYTM=","/pnigeus/sources/hero-schmidt-192.jpg":"sha256-s1OueY389Ga5qV2WWt7jmp29F5tFNKO2L1uRWRb54Q0="};
self.addEventListener("install", event => {
  // HTTP success does not establish edition identity. A stale entry page or
  // substituted scan must fail the complete install before this worker activates.
  const requests = FILES.map(url => new Request(url, { cache: "reload", integrity: INTEGRITY[url] }));
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(requests)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("pnigeus-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("message", event => {
  if (event.data?.type !== "PNIGEUS_INSPECT" || !event.ports[0]) return;
  // Inspection must not recreate an evicted or obsolete edition's cache.
  event.waitUntil(Promise.all(FILES.map(file => caches.match(file, { cacheName: CACHE }))).then(saved => {
    event.ports[0].postMessage({ type: "PNIGEUS_EDITION", edition: EDITION, complete: saved.every(Boolean) });
  }).catch(() => event.ports[0].postMessage({ type: "PNIGEUS_EDITION", edition: EDITION, complete: false })));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (event.request.mode === "navigate") {
    const page = url.pathname === BASE || url.pathname === BASE + "index.html" ? BASE + "index.html" : url.pathname;
    if (FILES.includes(page)) event.respondWith(fetch(event.request).catch(() => caches.match(page, { cacheName: CACHE })));
  } else if (FILES.includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname, { cacheName: CACHE }).then(cached => cached || fetch(event.request)));
  }
});
