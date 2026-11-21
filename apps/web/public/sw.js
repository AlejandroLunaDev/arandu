// Minimal service worker: it only takes control. No caching; offline study is out of scope.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
