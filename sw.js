/* Offline edition 00a80a0d1b7dd78eea4e918b212d2684a618104befa79a76c831832c084a053c. Generated from the complete build. */
const CACHE = "pnigeus-00a80a0d1b7dd78eea4e918b212d2684a618104befa79a76c831832c084a053c";
const EDITION = "00a80a0d1b7dd78eea4e918b212d2684a618104befa79a76c831832c084a053c";
const BASE = "/pnigeus/";
const FILES = ["/pnigeus/assets/index-BYu9oFl3.css","/pnigeus/assets/index-DKwbAqNH.js","/pnigeus/fonts/IBMPlex-OFL.txt","/pnigeus/fonts/IBMPlexSans-Regular.woff2","/pnigeus/fonts/IBMPlexSans-SemiBold.woff2","/pnigeus/fonts/NotoSerif-OFL.txt","/pnigeus/fonts/NotoSerif-Regular.ttf","/pnigeus/index.html","/pnigeus/sources/hero-fig76.jpg"];
const INTEGRITY = {"/pnigeus/assets/index-BYu9oFl3.css":"sha256-Ttm4/J6tXo4VnFg2ToqG/m6hZYjfjFHEB+QHsPCTaPQ=","/pnigeus/assets/index-DKwbAqNH.js":"sha256-hW7XAjLgZInIA4RemJ1TDRO/6fRJYVO3J83M4zoXhCA=","/pnigeus/fonts/IBMPlex-OFL.txt":"sha256-fmsoGO29j2oBroBkHMjxalEIDQj7TlMr46C290rbB9o=","/pnigeus/fonts/IBMPlexSans-Regular.woff2":"sha256-unEaMIX/nydEC2ucRVDPxHyXvzZZHV2pWLl1uzrdjBo=","/pnigeus/fonts/IBMPlexSans-SemiBold.woff2":"sha256-94BIAw6rYuhg76OaDfeeLlWBvxIuuVubxCwLikmI0gU=","/pnigeus/fonts/NotoSerif-OFL.txt":"sha256-zumJL58MyP6ILJ6VN+5qiWIdhu586vcLAuKyscJcBho=","/pnigeus/fonts/NotoSerif-Regular.ttf":"sha256-VHPS5DvdAY7hJKSt26gJH9CimJSxIcu3QQI69lSWYrY=","/pnigeus/index.html":"sha256-GNvNZkMDqEpVRcmt9EO8sg1YZzNTxpu5G5wD9PFIqBU=","/pnigeus/sources/hero-fig76.jpg":"sha256-a7PsXbOiUKTUSJW1GqRC8N4oAMwyjg1xe3F3pNWLYTM="};
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
  event.waitUntil(caches.open(CACHE).then(cache => cache.keys()).then(keys => {
    const saved = new Set(keys.map(request => new URL(request.url).pathname));
    event.ports[0].postMessage({ type: "PNIGEUS_EDITION", edition: EDITION, complete: FILES.every(file => saved.has(file)) });
  }).catch(() => event.ports[0].postMessage({ type: "PNIGEUS_EDITION", edition: EDITION, complete: false })));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (event.request.mode === "navigate") {
    const page = url.pathname === BASE || url.pathname === BASE + "index.html" ? BASE + "index.html" : url.pathname;
    if (FILES.includes(page)) event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match(page))));
  } else if (FILES.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname)).then(cached => cached || fetch(event.request)));
  }
});
