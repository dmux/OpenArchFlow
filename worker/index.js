// Custom service worker code, bundled into the generated sw.js by next-pwa.
//
// Calls to a local minilake (http://localhost:8000, http://127.0.0.1:8000, ...) must
// not go through the service worker. Chrome's Local Network Access check only asks
// the user for permission when the page itself makes the request; a request made by
// the service worker is denied outright ("Permission was denied for this request to
// access the `loopback` address space"). This listener is registered before
// Workbox's routes and stops the event there, so the browser handles the request
// natively.
self.addEventListener("fetch", (event) => {
  const { hostname } = new URL(event.request.url);
  if (
    hostname === "localhost" ||
    hostname === "[::1]" ||
    hostname === "::1" ||
    /^127\./.test(hostname)
  ) {
    event.stopImmediatePropagation();
  }
});
