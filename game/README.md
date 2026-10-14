# game/ - сама гра (React + Vite)

Уся гра живе тут, як самостійний React-застосунок без Next.js:

```
game/
  index.html            шаблон (тег SDK агрегатора підставляється під час білду)
  vite.config.ts        ціль білду = --mode portal|crazygames|poki|itch
  src/main.tsx, App.tsx точка входу standalone-білду
  src/components/       ігровий UI (3×3, Ultimate, 5×5, гра з другом, стилі)
  src/lib/              firebase, теми, імена, онлайн-кімнати, лог партій, assetUrl
  src/portal/           PortalGameBridge (postMessage з порталом Playwire) + PORTAL_ORIGIN
  src/sdk/              адаптери CrazyGames / Poki / none
  scripts/build-publish.mjs  CI: ZIP + завантаження в Firebase Storage
```

Next.js-сайт (`../app/`) - лише обгортка: SEO-сторінки, адмінка, роутинг
(`app/components/TicTacToeEntry.tsx`, `PlayRoomEntry.tsx`). Гру він імпортує через
alias `@game/*` -> `game/src/*`. Ігровий код **не** імпортує `next/*` і нічого з `app/`.

Окремого `node_modules` у `game/` немає навмисно: Vite і Next використовують ті самі
`react`/`styled-components` з кореня - інакше сайт отримав би дві копії React.

## Команди (з кореня проєкту)

```bash
npm run game:dev            # локальна розробка гри, http://localhost:5173
npm run game:build          # -> game/dist/portal/  (ZIP-ціль для порталу)
npm run game:build:crazygames | game:build:poki | game:build:itch
npm run game:preview        # віддати зібраний game/dist/portal
npm run game:typecheck
```

Конфіг (`NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PORTAL_ORIGIN`)
читається з кореневого `.env.local` - того самого, що й у сайту.

## Кнопка "Зібрати гру" в адмінці

Адмінка -> **Білд гри**:

1. Адмінка створює `gameBuilds/{id}` (status `queued`) і викликає
   `POST /api/admin/game-build` з Firebase ID token.
2. Роут перевіряє claim `admin` і запускає `.github/workflows/build-game.yml`
   (`workflow_dispatch`) на гілці `main`. **Збирається те, що запушено в main.**
3. Workflow: `npm ci` -> `vite build --mode portal` -> `build-publish.mjs publish`:
   ZIP (index.html у корені архіву) і розпакована копія -> Firebase Storage
   `game-builds/<id>/`, потім `game-builds/current.json` перемикається на новий білд.
4. Адмінка наживо показує статус, дату, commit, розмір, посилання
   "Завантажити ZIP для порталу" і "Відкрити гру ↗" (`/game/index.html` на сайті,
   віддається з Storage роутом `app/game/[[...path]]/route.ts`).

### Одноразове налаштування

**GitHub** (repo -> Settings -> Secrets and variables -> Actions):
- secret `FIREBASE_SERVICE_ACCOUNT` - JSON ключа service account Firebase-проєкту
  (Firebase Console -> Project settings -> Service accounts -> Generate new private key).
- variables: `NEXT_PUBLIC_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`,
  `..._STORAGE_BUCKET`, `..._MESSAGING_SENDER_ID`, `..._APP_ID`, `..._MEASUREMENT_ID`,
  `NEXT_PUBLIC_FIRESTORE_DATABASE_ID`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PORTAL_ORIGIN`
  - ті самі значення, що в `.env.local`.

**Vercel** (Settings -> Environment Variables, лише сервер):
- `GITHUB_BUILD_TOKEN` - fine-grained PAT на цей репозиторій з правом
  **Actions: Read and write**.
- опційно `GITHUB_BUILD_REPO` (за замовч. `fia-t/tic-tac-toe`), `GITHUB_BUILD_REF` (`main`).

**Firebase**: задеплоїти оновлені правила -
`firebase deploy --only firestore:rules,storage`.

## Адаптери агрегаторів (`src/sdk/`)

- **`crazygames.ts`** - `window.CrazyGames.SDK` (HTML5 v2). https://docs.crazygames.com/sdk/html5-v2/
- **`poki.ts`** - `window.PokiSDK`. https://sdk.poki.com/html5
- **`qsplay.ts`** - портал play.quartsoft.com, QSPlay SDK (`https://sdk.quartsoft.com/v1/sdk.js`).
  https://docs-dev.quartsoft.com/sdk/intro. Обовʼязкові loading/gameplay-виклики йдуть через
  `lifecycle.ts` (без дублів і перекриттів, gameplayStop при прихованій вкладці);
  `progress.ts` - статистика в `data` (ключ `stats`) + `reportPlayerLevel(перемоги)`;
  інвайти "Гри з другом" - `game.inviteLink({ roomId })` / `getInviteParams()`;
  `setGameContext` - режим/результат для звітів гравців.
  Перевірка локально: `npm run game:dev`, відкрити з `?sdk-mock=1&sdk-debug=1`
  (інвайт: `&sdk-mock-invite=<base64url з inviteLink>`, вхід: `QSPlaySDK.__mock.login()` у консолі).
  Мова: `game.getConfig().locale` + `addLocaleListener` -> `lib/i18n.ts` (uk/en, решта -> en).
- **Локалізація** - `lib/i18n.ts`: словники uk/en, `useT()` у компонентах. Сайт завжди uk,
  standalone-білд - мова браузера, портал - мова порталу. Для en імена гравців з
  `DEFAULT_NAMES_EN` (імена в адмінці українські).
- **Звук** - `lib/sound.ts`: синтез WebAudio (без файлів), кнопка `SoundToggle` (вибір у
  localStorage `ttt-muted`), глушиться у фоновій вкладці та на паузі/рекламі порталу.
- **Виклик дня** - `lib/daily.ts` (шаблони, зірки, серія, збереження) + `components/DailyChallenge.tsx`
  (кнопка зліва вгорі, картки виклику й результату, шеринг емодзі-сіткою). Шаблон дня = номер дня
  (1 = 01.01.2026) -> `DAILY_TEMPLATES`. Портал: стан у `QSPlaySDK.data` (ключ `daily`), посилання -
  `game.shareLink()`; сайт/агрегатори - localStorage `ttt-daily`. Рівень ШІ виклику -
  `setDifficultyOverride`, вибір гравця не змінюється. Нові шаблони (модифікатори) - лише в масив.
- **Модифікатори** - `lib/modifiers.ts` (вибір, доступність за режимом, модифікатор тижня),
  `components/modEngine.ts` (правила й ШІ для зникаючих фішок, гравітації, каміння, мізеру;
  звичайні партії лишаються на `gameLogic.ts`/`aiLevels.ts`), `components/MoveTimer.tsx` (таймер 5 с).
  3×3: зникаючі, мізер, таймер; 5×5: гравітація, каміння, мізер, таймер; Ultimate: таймер.
  Виклик дня задає модифікатор через `setModifierOverride`; з #288 у ротації шаблони з модифікаторами.
- **Монети й скіни** - `lib/wallet.ts` (монети, колекція, примірка 24 год, нагороди за партії й виклик
  дня; на порталі - `QSPlaySDK.data`, ключ `wallet`), `components/SkinShop.tsx`. Скіни = вбудована
  «Класика» (`CLASSIC_THEME`, SVG у `public/images/themes`, у стилі логотипа) + активні теми з адмінки;
  ціна - поле `price` теми в адмінці (порожньо = `DEFAULT_SKIN_PRICE`). Примірка за рекламу - лише де
  `sdk.hasRewardedAds` (CrazyGames, Poki).
- **Кампанія** - `lib/campaign.ts` (20 рівнів у 3 розділах, зірки, відкриття: рівні по черзі, розділ -
  з 12 зірок попереднього; на порталі - `QSPlaySDK.data`, ключ `campaign`), `components/CampaignMap.tsx`
  (карта, картка результату, +10 монет за кожну нову зірку). Рівень грається тим самим механізмом, що й
  виклик дня (`DailyRun` з `kind: "campaign"`); `preset` - стартова позиція головоломки (лише 3×3).
- **Вигляд поля** - `boardSlab`/`boardTile` у `gameStyles.ts`: об'ємна плита й окремі клітинки-плитки
  поверх фону теми, однаково для 3×3, 5×5, Ultimate і онлайн-гри.
- **Iframe порталу** - `Container` масштабує поле від висоти (`--board`, `100dvh`), прокручується замість
  обрізання; кнопки в кутах (`HudLeft`, `SoundToggle`) - у зарезервованому верхньому ряду.
- **`none.ts`** - itch.io: реклами з SDK немає (на порталі її показує сам
  портал через `PortalGameBridge`), `showRewardedAd()` одразу повертає `true`.

Перед сабмітом на агрегатор звірте сигнатури SDK з актуальною документацією.
