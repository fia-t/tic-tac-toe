#!/usr/bin/env node
/**
 * Одноразовий скрипт: призначає Firebase Custom Claim { admin: true }
 * користувачу за email через Firebase Admin SDK.
 *
 * Запуск (з кореня tictactoe-game/tictactoe-game):
 *   node scripts/setAdminClaim.js user@example.com
 *   npm run admin:set-claim -- user@example.com
 *
 * Потребує облікових даних Google Application Default Credentials -
 * див. scripts/README.md. Ключ сервісного акаунта НІКОЛИ не читається
 * з файлу в цьому репозиторії - лише зі змінної середовища
 * GOOGLE_APPLICATION_CREDENTIALS або з `gcloud auth application-default login`.
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const email = process.argv[2];

if (!email) {
    console.error("Використання: node scripts/setAdminClaim.js <email>");
    process.exit(1);
}

// ADC типу "authorized_user" (gcloud auth application-default login) не несе
// в собі project id (на відміну від service account key), тож Admin SDK не
// завжди може визначити проєкт сам. Пробуємо явні env-змінні, а якщо їх
// немає - беремо NEXT_PUBLIC_FIREBASE_PROJECT_ID з .env.local застосунку.
function resolveProjectId() {
    const fromEnv = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
    if (fromEnv) return fromEnv;

    try {
        const envPath = path.join(__dirname, "..", ".env.local");
        const content = fs.readFileSync(envPath, "utf8");
        const match = content.match(/^NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.+)$/m);
        if (match) return match[1].trim();
    } catch {
        // .env.local відсутній - нехай Admin SDK спробує визначити проєкт сам
    }
    return undefined;
}

async function main() {
    const projectId = resolveProjectId();
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        ...(projectId ? { projectId } : {}),
    });
    console.log(`Firebase project: ${projectId || "(визначається автоматично Admin SDK)"}`);

    let user;
    try {
        user = await admin.auth().getUserByEmail(email);
    } catch (err) {
        if (err.code === "auth/user-not-found") {
            console.error(`Користувача з поштою "${email}" не знайдено в Firebase Authentication.`);
            console.error("Спершу створіть цей акаунт (Email/Password) через Firebase Console -> Authentication -> Users.");
        } else {
            console.error("Не вдалося знайти користувача:", err.message);
        }
        process.exit(1);
    }

    const existingClaims = user.customClaims || {};

    if (existingClaims.admin === true) {
        console.log(`Користувач ${email} (uid: ${user.uid}) вже має admin: true. Нічого не змінено.`);
        return;
    }

    const updatedClaims = { ...existingClaims, admin: true };

    try {
        await admin.auth().setCustomUserClaims(user.uid, updatedClaims);
    } catch (err) {
        console.error("Не вдалося встановити custom claim:", err.message);
        process.exit(1);
    }

    console.log("Готово! Custom claims оновлено.");
    console.log(`  Користувач: ${email}`);
    console.log(`  UID:        ${user.uid}`);
    console.log(`  Claims:     ${JSON.stringify(updatedClaims)}`);
    console.log("");
    console.log(
        "Важливо: користувачу потрібно перелогінитись (або примусово оновити ID token)," +
            " щоб новий claim з'явився в його сесії - Firebase не оновлює вже видані токени заднім числом."
    );
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Неочікувана помилка:", err);
        process.exit(1);
    });
