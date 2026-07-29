# Tic Tac Toe - білд для ігрових агрегаторів

Самодостатній HTML5-білд гри (без Firebase-логіну, без SSR/Next.js) для сабміту на
CrazyGames, Poki та itch.io. Не дублює UI основного сайту (`../app/`) - переважна
більшість ігрових компонентів імпортується напряму звідти через `@/app/...` (той самий
шлях, що й у Next-застосунку), і жоден із них не залежить від `next/*`. Тут написані
лише: точка входу (`src/App.tsx`/`main.tsx`), SDK-адаптери агрегаторів (`src/sdk/`) і
три HTML-шаблони під кожен агрегатор.

## Перший запуск

```bash
cd aggregator
npm install
cp .env.local.example .env.local   # заповніть NEXT_PUBLIC_FIREBASE_* тими самими
                                    # значеннями, що й у ../.env.local основного сайту -
                                    # "Гра з другом" працює через той самий Firebase-проєкт
npm run dev                        # локальна розробка, за замовчуванням ціль crazygames
```

## Білд під конкретний агрегатор

```bash
npm run build:crazygames   # -> dist/crazygames/
npm run build:poki         # -> dist/poki/
npm run build:itch         # -> dist/itch/
npm run build:all          # усі три одразу
```

Кожна команда сама підміняє `index.html` на потрібний шаблон
(`index.crazygames.html` / `index.poki.html` / `index.itch.html` - різниця лише в
тегу SDK-скрипта в `<head>`) і виставляє `VITE_TARGET`, від якого залежить, який
адаптер із `src/sdk/` обереться в рантаймі (`src/sdk/index.ts`).

Перевірити локально перед пакуванням:

```bash
npm run serve:crazygames   # відкриє dist/crazygames через статичний сервер
```

## Пакування для сабміту

Кожен агрегатор очікує zip з `index.html` у **корені** архіву (не в підпапці):

```bash
cd dist/crazygames && zip -r ../../tic-tac-toe-crazygames.zip . && cd ../..
cd dist/poki && zip -r ../../tic-tac-toe-poki.zip . && cd ../..
```

Для itch.io зручніше залити напряму через `butler` (офіційний CLI itch.io) або
вручну як HTML5-проєкт із чекбоксом "This file will be played in the browser" на
`index.html`.

## Що робить кожен адаптер (`src/sdk/`)

- **`crazygames.ts`** - `window.CrazyGames.SDK` (HTML5 v2): `game.sdkGameLoadingStart/Stop`,
  `game.gameplayStart/Stop`, `ad.requestAd("midgame"|"rewarded", callbacks)`,
  `game.happytime`. Джерело: https://docs.crazygames.com/sdk/html5-v2/
- **`poki.ts`** - `window.PokiSDK`: `init`, `gameLoadingFinished`, `gameplayStart/Stop`,
  `commercialBreak`, `rewardedBreak` (повертає `boolean` - показано рекламу чи ні).
  Джерело: https://sdk.poki.com/html5
- **`none.ts`** - itch.io / будь-яке інше оточення без відомого SDK: реклами немає, тож
  `showRewardedAd()` одразу повертає `true` (не блокує "Гра з другом" - показувати
  просто нема чим), `showMidgameAd()` - no-op.

**Важливо:** методи цих SDK можуть змінитися з часом - перед реальним сабмітом звірте
сигнатури з актуальною документацією агрегатора (`docs.crazygames.com`, `sdk.poki.com`),
особливо якщо збірка відкладена на кілька місяців від дати цього README.

## "Гра з другом" за рекламою

Тільки в цьому білді (не на сайті) кнопка "Гра з другом" у кожному офлайн-режимі
спершу викликає `sdk.showRewardedAd()` (`onBeforeFriendOpen` prop, прокинутий у
`src/App.tsx`) і відкриває модалку лише якщо реклама переглянута. На сайті цей prop не
передається - там режим лишається безкоштовним, як і раніше.

## Чекліст перед сабмітом (кожна платформа окремо)

- [ ] Замінити плейсхолдер-домен/email у `../app/lib/seo/site-config.ts` на реальні
      (якщо посилаєтесь на сайт із опису гри на агрегаторі).
- [ ] Privacy Policy доступна публічно (сайтова `/privacy` підійде) - усі три платформи
      вимагають посилання на неї при сабміті.
- [ ] **Звірити актуальні вимоги** кожної платформи до розміру білду, thumbnail
      (зазвичай квадратний PNG/JPG) і промо-відео на її dev-порталі перед сабмітом -
      ці цифри періодично змінюються, тому тут навмисно не зафіксовані як факт.
  - CrazyGames: https://docs.crazygames.com/requirements/
  - Poki: https://sdk.poki.com/sdk-documentation
  - itch.io: https://itch.io/docs/creators/html5
- [ ] Прогнати `npm run build:all` і вручну пройти всі 4 режими (3×3, Ultimate, 5×5,
      Гра з другом) у кожному з трьох `dist/<target>` через `npx serve` - консоль без
      помилок, немає звернень до домену основного сайту.

## Відомі обмеження

- SDK-методи (особливо CrazyGames - `docs.crazygames.com/sdk/html5-v2/`) можуть
  оновитись; тестового акаунта агрегатора для end-to-end перевірки реальних показів
  реклами в цьому репозиторії немає - `requestAd`/`commercialBreak`/`rewardedBreak`
  перевірені лише проти опублікованої документації, не проти живого дашборду.
