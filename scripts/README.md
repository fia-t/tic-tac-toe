# scripts/setAdminClaim.js

Одноразовий локальний скрипт для призначення **першого** адміністратора.
Встановлює Firebase custom claim `admin: true` користувачу за email через
Firebase Admin SDK. Це єдиний спосіб отримати цей claim у проєкті - жоден
клієнтський код чи публічна Cloud Function цього зробити не можуть.

Ніякий ключ сервісного акаунта не зберігається і не комітиться в цей
репозиторій. Скрипт читає облікові дані через Google Application Default
Credentials (ADC) - один з двох варіантів нижче.

## Передумова

1. У Firebase Console -> Authentication -> Sign-in method увімкнено Email/Password.
2. У Firebase Console -> Authentication -> Users вручну створено акаунт
   майбутнього адміна (email + пароль).

## Варіант A: `gcloud auth application-default login` (рекомендовано локально)

Не потребує завантаження жодного файла-ключа.

```bash
gcloud auth application-default login
```

Відкриється браузер для входу тим Google-акаунтом, що має доступ до вашого
Firebase-проєкту (роль Editor/Owner або Firebase Admin). Дані ADC осядуть
у стандартній системній теці (`~/.config/gcloud/...` на macOS/Linux,
`%APPDATA%\gcloud\...` на Windows) - поза цим репозиторієм.

Якщо gcloud не знає, який проєкт використовувати:

```bash
gcloud config set project <ваш-firebase-project-id>
```

## Варіант B: `GOOGLE_APPLICATION_CREDENTIALS` (service account key)

1. Firebase Console -> Project settings -> Service accounts -> Generate new private key.
2. Збережіть завантажений JSON **поза репозиторієм** (наприклад,
   `~/secrets/tictactoe-admin-sdk.json`). Кореневий `.gitignore` цього
   проєкту додатково блокує випадковий коміт файлів з назвою
   `*serviceAccountKey*.json`/`*-firebase-adminsdk-*.json`, але найнадійніше -
   тримати ключ фізично поза деревом репозиторію.
3. Перед запуском скрипта:

   ```bash
   # macOS/Linux
   export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/key.json"

   # Windows PowerShell
   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\absolute\path\to\key.json"
   ```

## Запуск

```bash
cd tictactoe-game/tictactoe-game
node scripts/setAdminClaim.js admin@example.com
# або
npm run admin:set-claim -- admin@example.com
```

Скрипт:
- знайде користувача за email через Firebase Auth;
- збереже вже наявні custom claims і додасть `admin: true`, не затираючи інші;
- якщо `admin: true` вже стоїть - нічого не змінить і скаже про це;
- виведе UID і фінальний набір claims або зрозумілу помилку
  (користувача не знайдено, немає прав доступу, тощо).

## Після запуску

Custom claims "запікаються" у ID token користувача при видачі, тому вже
відкрита сесія в браузері їх одразу не побачить. Потрібно або:

- вийти і зайти в акаунт заново на `/admin`, або
- зачекати, поки Firebase сам оновить токен (до ~1 години), або
- в застосунку викликається примусове оновлення токена після логіну
  (`getIdTokenResult(user, true)`) - тому звичайний повторний логін
  на `/admin` вже підхопить новий claim одразу.

## Подальше керування ролями

Цей скрипт - разовий bootstrap для першого адміна. Якщо в майбутньому
знадобиться панель керування ролями інших користувачів, вона сама повинна
вимагати вже наявний `admin: true` claim (перевірку в Firestore/Storage
Rules і на бекенді), а не бути публічно доступною.
