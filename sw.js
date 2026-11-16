/* Prompt Studio — Service Worker (بدون Workbox)
   BUILD را فقط tools/stamp.js تغییر می‌دهد؛ دستی ویرایش نکن.
   استراتژی:
     • HTML، license-config.js و manifest  ← network-first (همیشه revalidate؛ اگر ۳٫۵ ثانیه جواب نیامد، نسخهٔ کش‌شده)
     • آیکن‌ها/تصاویر/فونت            ← cache-first
     • version.json و درخواست‌های بیرون از دامنه (سرور لایسنس، API) ← دست نمی‌خورند
   نصب «اتمی»: اگر حتی یک فایل دریافت نشود، SW جدید نصب نمی‌شود و نسخهٔ قبلی سالم می‌ماند.
   فعال‌سازی SW جدید فقط با پیام SKIP_WAITING (برنامه وقتی ویرایش ذخیره‌نشده‌ای نیست می‌فرستد). */
const BUILD = /*B*/"0552825a9bb4"/*E*/;
const CACHE = "ps-" + BUILD;
const NET_TIMEOUT = 3500;
const PRECACHE = [
  "./",
  "index.html",
  "app/",
  "app/index.html",
  "license-config.js",
  "manifest.webmanifest",
  "favicon.svg",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png"
];
const NETWORK_FIRST = /(\.html|\/license-config\.js|\.webmanifest)$/;

const scope = self.registration.scope;
function keyFor(u) {
  const url = new URL(u, scope);
  let p = url.pathname;
  if (p.endsWith("/")) p += "index.html";
  return url.origin + p;
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const seen = new Set();
    for (const u of PRECACHE) {
      const key = keyFor(u);
      if (seen.has(key)) continue;
      seen.add(key);
      const res = await fetch(new Request(new URL(u, scope).href, { cache: "reload", credentials: "same-origin" }));
      if (!res.ok) throw new Error("precache failed: " + u + " " + res.status);
      await cache.put(key, res);
    }
  })());
  // عمداً skipWaiting() اینجا نیست؛ برنامه تصمیم می‌گیرد کی امن است.
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  const d = event.data || {};
  if (d.type === "SKIP_WAITING") self.skipWaiting();
  else if (d.type === "GET_BUILD" && event.ports && event.ports[0]) event.ports[0].postMessage(BUILD);
});

function clean(res) {
  // پاسخ ریدایرکت‌شده برای navigation مجاز نیست؛ پرچم redirected را حذف می‌کنیم.
  if (!res.redirected) return res;
  return res.blob().then((b) => new Response(b, { status: res.status, statusText: res.statusText, headers: res.headers }));
}

async function networkFirst(event, req, key) {
  const cache = await caches.open(CACHE);
  const net = fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then((res) => {
    if (res.ok) cache.put(key, res.clone());
    return res;
  });
  event.waitUntil(net.catch(() => {}));
  const timeout = new Promise((r) => setTimeout(() => r(null), NET_TIMEOUT));
  try {
    const first = await Promise.race([net, timeout]);
    if (first && first.status < 500) return clean(first);
    const hit = await cache.match(key);
    if (hit) return hit;
    return clean(await net);
  } catch (err) {
    const hit = await cache.match(key);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, key) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(key);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.type === "basic") cache.put(key, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/version.json") || url.pathname.indexOf("/.well-known/") !== -1) return;
  const key = keyFor(req.url);
  if (req.mode === "navigate" || NETWORK_FIRST.test(key)) {
    event.respondWith(networkFirst(event, req, key));
  } else {
    event.respondWith(cacheFirst(req, key));
  }
});
