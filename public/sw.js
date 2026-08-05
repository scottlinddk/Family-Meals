/**
 * Service worker: what the installed app can still do without a connection.
 *
 * This app is used in two places that don't reliably have one — a kitchen at
 * the back of a flat, and a REMA with the signal a supermarket usually has —
 * and it is now installable, which sets the expectation that opening it does
 * *something*. So three caches, each with a different bargain:
 *
 *   * build assets (`/assets/…`, hashed by Vite, immutable) — cache-first,
 *     because the bytes behind a hashed URL can never change
 *   * documents — network-first, falling back to the last copy of that page,
 *     then to the offline page
 *   * shopping-list data — network-first, falling back to the last copy, so
 *     the list is readable in an aisle even when the request times out
 *
 * The two caches that hold anything personal (documents and list data) are
 * emptied when someone signs out, so a shared laptop doesn't keep serving one
 * family's plan to the next person to open the app.
 *
 * Bump VERSION when this file changes: it's the only thing that retires the
 * old caches.
 */
const VERSION = "v1";
const STATIC_CACHE = `family-meals-static-${VERSION}`;
const DOCUMENT_CACHE = `family-meals-documents-${VERSION}`;
const DATA_CACHE = `family-meals-data-${VERSION}`;
const OWN_CACHES = [STATIC_CACHE, DOCUMENT_CACHE, DATA_CACHE];

const OFFLINE_URL = "/offline.html";

/** Everything needed to draw *something* on a cold, offline start. */
const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Individually, so one missing file can't fail the whole install.
      await Promise.all(
        PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => {})),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("family-meals-") && !OWN_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Clears everything personal. Called on sign-out and on demand from the page. */
async function clearPersonalCaches() {
  await Promise.all([caches.delete(DOCUMENT_CACHE), caches.delete(DATA_CACHE)]);
}

self.addEventListener("message", (event) => {
  if (event.data === "clear-personal-caches") event.waitUntil(clearPersonalCaches());
});

function isShoppingListData(url) {
  return (
    /^\/api\/weeks\/[^/]+\/shopping-list(\/checks)?$/.test(url.pathname) ||
    /^\/api\/shopping-list\/[^/]+(\/checks)?$/.test(url.pathname)
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/**
 * Network wins whenever it answers; the cache is only there for when it
 * doesn't. Never the other way round — a shopping list is being ticked by
 * someone else while you read it, and showing a stale one on purpose would be
 * worse than showing nothing.
 */
async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    // `Cache-Control: private, no-store` on the shared-list routes is aimed at
    // proxies and shared caches; this one is first-party, on the device that
    // asked, and cleared on sign-out.
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.method !== "GET") {
    // Signing out is the moment the cached pages and lists stop being this
    // person's. Catch it here rather than trusting the page to tell us,
    // since the page is navigating away as it happens.
    if (url.pathname === "/auth/logout") event.waitUntil(clearPersonalCaches());
    return;
  }

  // Nothing about authentication is ever served from a cache.
  if (url.pathname.startsWith("/auth/")) return;

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isShoppingListData(url)) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, DOCUMENT_CACHE, OFFLINE_URL));
    return;
  }

  // Everything else — the rest of the API — goes to the network and is
  // allowed to fail there. A stale week plan or offer set that claimed to be
  // current would be worse than an honest error.
});
