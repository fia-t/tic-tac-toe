// Мінімальний service worker: кешує ігрову оболонку та іконки для повторних
// візитів і показує /offline замість зламаної сторінки, коли мережа недоступна.
// Навмисно НЕ кешує /play/[roomId] чи інші динамічні дані - онлайн-мультиплеєр
// завжди має вимагати мережі, кеш тут лише про статичний "shell" застосунку.
const CACHE_NAME = "tictactoe-shell-v1";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/images/background-image.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Тільки навігаційні запити (перехід між сторінками) отримують офлайн-фолбек -
  // API-виклики Firebase мають просто провалитись і дати додатку самому це обробити.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((res) => res || Response.error()))
    );
    return;
  }

  if (PRECACHE_URLS.some((url) => request.url.endsWith(url))) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});
