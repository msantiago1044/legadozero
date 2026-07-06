/**
 * LegadoZero — Service Worker
 * Enables PWA offline functionality and install prompt
 */

const CACHE_NAME = "legadozero-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache Supabase, GLM, Lemon Squeezy API calls
  if (
    url.hostname.includes("supabase") ||
    url.hostname.includes("bigmodel") ||
    url.hostname.includes("lemonsqueezy") ||
    url.hostname.includes("twilio") ||
    url.pathname.startsWith("/api/")
  ) {
    return; // Let browser handle normally
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match("/index.html")); // SPA fallback
    })
  );
});

// Push notifications (for web push alerts)
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || "LegadoZero requiere tu atención.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-96.png",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/" },
    actions: [
      { action: "pulse", title: "✅ Estoy Vivo", icon: "/icons/icon-96.png" },
      { action: "dismiss", title: "Más tarde" },
    ],
  };
  event.waitUntil(
    self.registration.showNotification(data.title || "LegadoZero", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "pulse") {
    event.waitUntil(clients.openWindow("/?action=pulse"));
  } else {
    event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
  }
});
