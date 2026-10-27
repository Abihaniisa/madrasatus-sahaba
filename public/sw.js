// public/sw.js — custom service worker for vite-plugin-pwa (injectManifest mode).
// Uses Workbox precaching. autoUpdate behavior: skipWaiting + clientsClaim.

import { precacheAndRoute } from "workbox-precaching";

// __WB_MANIFEST is injected by vite-plugin-pwa at build time with all hashed assets.
precacheAndRoute(self.__WB_MANIFEST || []);

// Activate new SW immediately without waiting for old clients to close.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
