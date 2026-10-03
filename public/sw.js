// Cache public static assets only; private pages and RPCs stay on the network.
const CACHE_NAME = "zenith-public-assets-v2";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("zenith-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    event.request.mode === "navigate"
  )
    return;
  if (
    !url.pathname.startsWith("/assets/") &&
    !["/favicon.ico", "/manifest.webmanifest"].includes(url.pathname)
  )
    return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok && response.type === "basic")
        await cache.put(event.request, response.clone());
      return response;
    }),
  );
});
