import type { NextConfig } from "next";

// CSP зібраний під реально підключені інтеграції: Firebase (Firestore/Auth),
// Google Analytics/Tag Manager, AdSense/NitroPay (вимикаються через
// NEXT_PUBLIC_AD_PROVIDER=none - домени лишаються в дозволі, але скрипти не
// вставляються, поки провайдер не увімкнено). 'unsafe-inline' на script-src
// потрібен Next.js для інлайн-даних гідратації; 'unsafe-eval' - лише в dev
// для Fast Refresh. Якщо посилюватимете CSP далі - переходьте на nonce-based
// підхід (next.config -> generateNonce) замість 'unsafe-inline'.
const isDev = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://s.nitropay.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://firestore.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com;
  frame-src 'self' https://www.googletagmanager.com https://googleads.g.doubleclick.net;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
`.replace(/\s{2,}/g, " ").trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Без цього styled-components генерує нестабільні className-хеші окремо
  // для серверного рендеру й клієнтської гідратації - кожен styled-компонент
  // у застосунку тоді провокує React hydration mismatch.
  compiler: {
    styledComponents: true,
  },

  // Офіційний спосіб (Next.js 15.2+) вимкнути індикатор дев-режиму ("N" у
  // нижньому лівому куті) - без CSS-хаків, які б ламались при оновленнях Next.js.
  devIndicators: false,

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
