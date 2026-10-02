// Базовий шлях до статичних картинок гри (public/images, public/icons).
// На сайті (Next.js) - "/" (кореневий public/). У standalone-білді (Vite) -
// "./" через define у game/vite.config.ts: ZIP розпаковується на портал у довільну
// підпапку, і абсолютні "/images/..." там вказували б у корінь чужого домену.
const ASSET_BASE = process.env.NEXT_PUBLIC_GAME_ASSET_BASE || "/";

export const assetUrl = (path: string): string => `${ASSET_BASE}${path.replace(/^\//, "")}`;
