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
- **`none.ts`** - портал / itch.io: реклами з SDK немає (на порталі її показує сам
  портал через `PortalGameBridge`), `showRewardedAd()` одразу повертає `true`.

Перед сабмітом на агрегатор звірте сигнатури SDK з актуальною документацією.
