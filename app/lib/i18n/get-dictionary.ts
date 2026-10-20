import type { Locale } from "./locales";
import type { Dictionary } from "./dictionaries/en";

const loaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  en: () => import("./dictionaries/en"),
  uk: () => import("./dictionaries/uk"),
  de: () => import("./dictionaries/de"),
  es: () => import("./dictionaries/es"),
  fr: () => import("./dictionaries/fr"),
  it: () => import("./dictionaries/it"),
  pt: () => import("./dictionaries/pt"),
  nl: () => import("./dictionaries/nl"),
  pl: () => import("./dictionaries/pl"),
};

// Наразі всі сторінки викликають getDictionary("en") напряму (єдина активна
// мова). Коли з'явиться реальний [locale]-роутинг, замініть жорсткий "en" на
// параметр locale із сегмента шляху - сама функція вже готова для будь-якої з 9 мов.
export async function getDictionary(locale: Locale = "en"): Promise<Dictionary> {
  const load = loaders[locale] ?? loaders.en;
  const mod = await load();
  return mod.default;
}
