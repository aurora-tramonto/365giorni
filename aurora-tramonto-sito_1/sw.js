/* Dall'Aurora al Tramonto: uso offline e aggiornamenti. 1792086249 cambia a ogni costruzione del sito. */
const BUILD = "1792086249";
const CACHE = "aut-" + BUILD;
const SCOPE = self.registration.scope;
const PAGES = [SCOPE, SCOPE + "info/", SCOPE + "privacy/"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const urls = [...PAGES, SCOPE + "manifest.webmanifest", SCOPE + "icon.svg", SCOPE + "apple-touch-icon.png", SCOPE + "cover.jpg"];
    await Promise.all(urls.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {})));
    for (const p of PAGES) {
      try {
        const r = await c.match(p); if (!r) continue;
        const t = await r.text();
        const found = t.match(/\/[^"'\s)\\]*\/next\/static\/[^"'\s)\\]+/g) || [];
        await Promise.all([...new Set(found)].map((u) => c.add(new Request(new URL(u, SCOPE).href)).catch(() => {})));
      } catch (_) {}
    }
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("aut-") && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (e) => { if (e.data === "SKIP") self.skipWaiting(); });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin && url.href.startsWith(SCOPE);
  if (req.mode === "navigate" && same) {
    e.respondWith((async () => {
      try {
        const r = await fetch(req);
        if (r.ok) { const c = await caches.open(CACHE); c.put(req, r.clone()); }
        return r;
      } catch (_) {
        return (await caches.match(req, { ignoreSearch: true })) || (await caches.match(SCOPE)) || Response.error();
      }
    })());
    return;
  }
  if (same) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok) { const c = await caches.open(CACHE); c.put(req, r.clone()); }
      return r;
    })());
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE + "-fonts");
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })());
  }
});
