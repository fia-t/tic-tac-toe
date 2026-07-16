# Tic Tac Toe Online

Безкоштовна браузерна гра в хрестики-нулики на Next.js 15 (App Router) + Firebase,
з повноцінним SEO-шаром: метадані, sitemap/robots, JSON-LD, блог, i18n-заготовка,
менеджер реклами, аналітика, PWA.

## Швидкий старт

```bash
cd tictactoe-game
npm install
cp .env.local.example .env.local   # заповніть Firebase-ключі та (опційно) SEO/ads/analytics
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000).

> Next.js читає `.env.local` лише при старті сервера - після будь-якої зміни
> файлу **перезапустіть** `npm run dev`.

## Структура проєкту

```
app/
  page.tsx                  - головна: сама гра (vs AI), поза (marketing) групою
  play/, play/[roomId]/     - онлайн-кімнати (Firebase), не займані SEO-шаром
  admin/                    - адмін-панель (заборонена для індексації в robots.ts)
  (marketing)/               - route group: усі нові SEO/контент-сторінки
    layout.tsx               - header/footer/рекламні слоти для цієї групи
    about/, blog/, contact/, daily-challenge/, how-to-play/, leaderboard/,
    multiplayer/, play-vs-ai/, play-vs-friend/, privacy/, terms/,
    tic-tac-toe-rules/
  sitemap.ts, robots.ts, manifest.ts, opengraph-image.tsx, icon.png, apple-icon.png
  lib/
    seo/          - site-config.ts (домен/бренд), metadata.ts (генератор Metadata),
                     json-ld.tsx (Organization/WebApplication/VideoGame/Breadcrumb/Article)
    blog/posts.ts - дані статей блогу
    i18n/         - locales.ts, get-dictionary.ts, dictionaries/{en,uk,de,es,fr,it}.ts
  components/
    layout/        - SiteHeader, SiteFooter
    ads/AdsManager.tsx        - рекламні слоти (AdSense/NitroPay/Setupad/Mediavine)
    analytics/                - GoogleAnalytics, GoogleTagManager
    pwa/                      - ServiceWorkerRegistration, InstallPrompt
    social/ShareButtons.tsx
    seo/Breadcrumbs.tsx
public/
  sw.js         - мінімальний service worker (офлайн-фолбек)
  icons/        - згенеровані PNG-іконки (16/32/180/192/512)
```

Ігрові роути (`/`, `/play`, `/play/[roomId]`, `/admin`) навмисно лишились
поза `(marketing)` route group і виглядають так само, як і раніше - нова
навігація/реклама на них не впливає.

## Як додати рекламу

1. Оберіть провайдера в `.env.local`:
   ```
   NEXT_PUBLIC_AD_PROVIDER=adsense   # adsense | nitropay | setupad | mediavine | none
   ```
2. Заповніть відповідні ID для цього провайдера (там же, у `.env.local`):
   - AdSense: `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_SLOT_TOP` /
     `_BOTTOM` / `_SIDEBAR` / `_INCONTENT`.
   - NitroPay: `NEXT_PUBLIC_NITROPAY_SITE_ID`.
   - Setupad: `NEXT_PUBLIC_SETUPAD_PUBLISHER_ID`.
   - Mediavine: інтеграція запланована на майбутнє (потрібен окремий акаунт-менеджер).
3. Перезапустіть `npm run dev` / передеплойте.

Розмітка сторінок не змінюється - `<AdSlot position="..." />`
(`app/components/ads/AdsManager.tsx`) сам вирішує, що рендерити, залежно від
`NEXT_PUBLIC_AD_PROVIDER`. Доступні позиції: `top-banner`, `bottom-banner`,
`sidebar`, `between-content`, `reward`. У dev-режимі без реального ID
показується пунктирний плейсхолдер із назвою позиції (щоб бачити верстку);
у production він просто не рендериться, поки немає реальних ID.

## Як додати Google Search Console

1. Search Console -> Add property -> `NEXT_PUBLIC_SITE_URL` -> метод "HTML tag".
2. Скопіюйте значення `content="..."` і вставте в `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=xxxxxxxxxxxxxxxx
   ```
3. Задеплойте - тег автоматично зʼявиться в `<head>` (див. `verification.google`
   у `app/layout.tsx`).
4. У Search Console надішліть sitemap: `https://ваш-домен/sitemap.xml`.

## Як додати Google Analytics 4 / Google Tag Manager

```
NEXT_PUBLIC_ANALYTICS_ID=G-XXXXXXXXXX   # GA4 Measurement ID
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX          # GTM Container ID
```

Обидва підключаються лише якщо ID заданий (`app/components/analytics/*`) -
без ID жодних скриптів не вставляється. Можна використовувати одне з двох
або обидва одночасно.

## Як додати нову мову

i18n зараз - це **готова структура з активною лише English**, як і було
погоджено на старті проєкту (переклад усього контенту на 5 мов вручну дав би
непередбачувану якість без професійного перекладу).

Що вже є (`app/lib/i18n/`):
- `locales.ts` - список з 6 мов (`en`, `uk`, `de`, `es`, `fr`, `it`), `en` - дефолтна.
- `dictionaries/{locale}.ts` - короткі UI-рядки (навігація, футер, спільні
  кнопки) вже перекладені для всіх 6 мов.
- `get-dictionary.ts` - `getDictionary(locale)` асинхронно завантажує потрібний словник.

Щоб перевести конкретну мову з "заготовки" в реально доступну (напр. `/uk/...`):

1. Додайте `app/[locale]/` сегмент маршруту для сторінок, які мають
   перекладатись (найпростіше - обгорнути лише `(marketing)` сторінки,
   лишивши ігрові роути без префікса).
2. У кожному layout/page замініть жорсткий виклик `getDictionary("en")` на
   `getDictionary(params.locale)`.
3. Перекладіть довгий контент (статті блогу `app/lib/blog/posts.ts`, тексти
   `/how-to-play`, `/tic-tac-toe-rules` тощо) - словники з `dictionaries/`
   покривають лише UI-хром, не цей контент.
4. Додайте `alternates.languages` (hreflang) у `buildMetadata`
   (`app/lib/seo/metadata.ts`) для кожної активної мови.
5. Додайте нові URL у `app/sitemap.ts`.

Щоб додати 7-у мову: створіть `dictionaries/xx.ts` (TypeScript провалить
збірку, якщо пропустите ключ - копіюйте `en.ts` і перекладіть значення),
додайте `"xx"` в `locales` і `localeNames`/`localeToHreflang` у `locales.ts`,
і зареєструйте в `loaders` у `get-dictionary.ts`.

## Як додати нову гру / режим

1. Ігрова логіка живе в `app/components/gameLogic.ts` /
   `app/components/onlineGameLogic.ts` - нову логіку варто виносити так само
   окремим модулем, а не в компонент.
2. Для нового **офлайн** режиму: додайте варіант у `gameMode` в
   `app/components/tic-tac-toe.tsx` (за зразком `"traditional" | "difficult"`)
   і новий компонент на кшталт `DifficultTicTacToe`.
3. Для нового **онлайн** режиму: додайте варіант у `OnlineGameMode`
   (`app/components/onlineGameLogic.ts`) і обробіть його в `app/lib/onlineGame.ts`
   та `OnlineBoard.tsx`/`FriendGameModal.tsx`.
4. Додайте SEO-сторінку під нову гру в `app/(marketing)/` за зразком
   `play-vs-ai/page.tsx` (метадані через `buildMetadata`, breadcrumbs, CTA на
   реальний ігровий роут) і впишіть шлях в `app/sitemap.ts`.

## SEO-інфраструктура

- **Metadata API**: кожна сторінка викликає `buildMetadata()`
  (`app/lib/seo/metadata.ts`) - єдине джерело title/description/keywords/canonical/OG/Twitter.
- **JSON-LD**: `app/lib/seo/json-ld.tsx` - Organization + WebApplication
  (глобально, в `layout.tsx`), VideoGame (на `/play-vs-ai`), BreadcrumbList
  (у `Breadcrumbs`), BlogPosting (на сторінках блогу), FAQPage (на `/tic-tac-toe-rules`).
- **sitemap.xml / robots.txt**: генеруються динамічно (`app/sitemap.ts`,
  `app/robots.ts`) - офіційний App Router спосіб, нічого правити вручну.
- **Іконки/manifest**: `app/icon.png`, `app/apple-icon.png`, `app/manifest.ts`,
  `public/icons/*` згенеровані з `public/images/logo.png`. Це placeholder-якість
  (масштабоване лого) - перед публікацією варто замінити на дизайнерські іконки.
- **OG-зображення**: `app/opengraph-image.tsx` генерується динамічно через `next/og`.

## Реклама, аналітика, реферали - все вимкнено за замовчуванням

`NEXT_PUBLIC_AD_PROVIDER=none` і порожні `NEXT_PUBLIC_ANALYTICS_ID`/`NEXT_PUBLIC_GTM_ID`
означають, що жоден зовнішній рекламний/аналітичний скрипт не завантажується,
поки ви свідомо не заповните відповідні змінні середовища. Реальні рекламні
ID/домен/email у коді - лише плейсхолдери (`tictactoe-game.com`,
`hello@tictactoe-game.com`) - замініть їх перед публікацією.

## Безпека

`next.config.ts` додає CSP, `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy` до кожної відповіді. CSP дозволяє лише
домени вже підключених інтеграцій (Firebase, Google Analytics/GTM, AdSense,
NitroPay). Якщо ви приберете styled-components або захочете прибрати
`'unsafe-inline'` зі `script-src` - перейдіть на nonce-based CSP
(`generateNonce` у `next.config.ts`).

## Деплой

- **Vercel** - працює з коробки (`next build`), змінні середовища додайте в
  Project Settings -> Environment Variables.
- **Netlify** - офіційний Next.js Runtime підтримує App Router без змін;
  за потреби додайте `output: "standalone"` у `next.config.ts`.
- **Cloudflare Pages** - потребує `@cloudflare/next-on-pages` (не входить у
  цей проєкт) через відмінності edge-рантайму; `app/opengraph-image.tsx`
  використовує `export const runtime = "edge"` і сумісний із цим шляхом.

## Відомі обмеження (чесно)

- `/daily-challenge` і `/leaderboard` - це SEO-сторінки з описом функціоналу
  "Coming Soon", без реального бекенду (немає fake-даних, щоб не вводити в оману).
- i18n активний лише для English (структура для 5 інших мов готова, контент - ні).
- CSP/іконки/контактний email - production-ready каркас, але з
  placeholder-значеннями, які треба замінити реальними перед публікацією.
- Service worker кешує лише статичну "оболонку" - онлайн-мультиплеєр завжди
  вимагає мережі (і так і має бути).

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
