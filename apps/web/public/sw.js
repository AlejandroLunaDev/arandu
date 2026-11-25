// Minimal service worker: it takes control and passes page loads through to the network. No caching; offline study is
// out of scope. Chrome on Android still asks for a fetch handler that does something before it offers its install
// prompt, and ignores an empty one, so page loads go through it.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") event.respondWith(fetch(event.request));
});
