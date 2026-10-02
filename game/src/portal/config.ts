// Origin батьківської сторінки порталу для PortalGameBridge. Однаково резолвиться
// і на сайті (Next.js інлайнить NEXT_PUBLIC_*), і в standalone-білді (define у
// game/vite.config.ts) - тому живе тут, а не дублюється в кожній точці входу.
export const PORTAL_ORIGIN = process.env.NEXT_PUBLIC_PORTAL_ORIGIN || "https://play-dev.quartsoft.com";
