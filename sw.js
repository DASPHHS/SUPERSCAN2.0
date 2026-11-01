/* Offline application shell only; source data must never be served stale. */
const VERSION = "superscan-v2-shell-4";
const FILES = ["./", "./index.html", "./styles.css", "./src/app.js", "./src/pricing.js", "./src/recipes.js", "./src/weekly.js", "./src/meal-engine.js", "./favicon.svg", "./manifest.webmanifest"];
self.addEventListener("install",event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const url=new URL(event.request.url);if(url.origin!==self.location.origin||url.pathname.includes("/data/"))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});
