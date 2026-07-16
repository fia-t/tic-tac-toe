"use client";
import { useEffect } from "react";

// Реєстрація service worker винесена в окремий клієнтський компонент, бо
// navigator.serviceWorker існує лише в браузері - у RootLayout (Server Component)
// цей виклик впав би на build/SSR.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Мовчазний no-op: відсутність офлайн-кешу не повинна ламати саму гру.
    });
  }, []);

  return null;
}
