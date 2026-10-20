// Структура підготовлена для 9 мов (ті самі, що в грі); активна зараз лише "en" (дефолтна, без
// префікса в URL). Щоб увімкнути іншу мову як окремі роути (/uk/..., /de/...),
// див. розділ "Як додати нову мову" в README.
export const locales = ["en", "uk", "de", "es", "fr", "it", "pt", "nl", "pl"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  uk: "Українська",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  pl: "Polski",
};

// BCP 47 теги для hreflang/OpenGraph locale.
export const localeToHreflang: Record<Locale, string> = {
  en: "en",
  uk: "uk",
  de: "de",
  es: "es",
  fr: "fr",
  it: "it",
  pt: "pt",
  nl: "nl",
  pl: "pl",
};
