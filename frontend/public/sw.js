/* ClassyShop service worker
 * Hand-authored so the app keeps a small, predictable runtime cache without
 * pulling in Workbox. Registered from main.tsx in production only.
 */

const VERSION = "v1";
const STATIC_CACHE = `classyshop-static-${VERSION}`;
const IMAGE_CACHE = `classyshop-images-${VERSION}`;
const EXPECTED_CACHES = [STATIC_CACHE, IMAGE_CACHE];

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !EXPECTED_CACHES.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const isStaticAsset = (pathname) =>
  /\.(?:js|mjs|css|woff2?|ttf|otf|png|jpe?g|webp|avif|gif|svg|ico)$/i.test(
    pathname,
  );

const isCloudinaryImage = (url) =>
  url.hostname === "res.cloudinary.com" && url.pathname.includes("/image/");

/**
 * Navigations are network-first: the freshest shell wins, then the cached
 * shell lets the SPA boot offline.
 */
const handleNavigation = async (request) => {
  try {
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put("/index.html", response.clone());
    return response;
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    return (
      (await cache.match("/index.html")) ||
      (await cache.match("/")) ||
      Response.error()
    );
  }
};

/** Hashed production assets never change, so cache-first is safe. */
const handleStaticAsset = async (request) => {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
};

/** Product photos reuse the same URL, so a light revalidation is enough. */
const handleImage = async (request) => {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await network) || Response.error();
};

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept API traffic: axios must see offline failures so the cart
  // queue can persist mutations instead of being served stale JSON.
  if (url.pathname.startsWith("/api/")) return;

  if (url.origin !== self.location.origin) {
    if (isCloudinaryImage(url)) event.respondWith(handleImage(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
  }
});
