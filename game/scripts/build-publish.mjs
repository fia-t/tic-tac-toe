// Викликається з .github/workflows/build-game.yml (кнопка "Зібрати гру" в адмінці):
//
//   node game/scripts/build-publish.mjs status building   - збірку почато
//   node game/scripts/build-publish.mjs publish           - dist/<target> -> ZIP + Storage
//   node game/scripts/build-publish.mjs status failed     - щось упало (if: failure())
//
// Пише в Firestore gameBuilds/{BUILD_ID} (його створює адмінка в статусі queued) і в
// Storage game-builds/: <buildId>/<zip>, <buildId>/site/** (розпакована копія для /game
// на сайті) та current.json - вказівник на останній успішний білд, який читає
// app/game/[[...path]]/route.ts. current.json пишеться ОСТАННІМ, тож /game
// перемикається на новий білд атомарно, лише коли всі його файли вже на місці.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const gameDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requireEnv = (name) => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing env ${name}`);
    return value;
};

const buildId = requireEnv("BUILD_ID");
const target = process.env.GAME_TARGET || "portal";
const bucketName = requireEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
const databaseId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || "(default)";
const commit = process.env.GITHUB_SHA || "";
const runUrl =
    process.env.GITHUB_RUN_ID && process.env.GITHUB_REPOSITORY
        ? `${process.env.GITHUB_SERVER_URL || "https://github.com"}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : null;

const app = initializeApp({ credential: cert(JSON.parse(requireEnv("FIREBASE_SERVICE_ACCOUNT"))) });
const db = getFirestore(app, databaseId);
const bucket = getStorage(app).bucket(bucketName);
const buildDoc = db.collection("gameBuilds").doc(buildId);

const CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
};

const listFiles = (dir, base = dir) =>
    readdirSync(dir).flatMap((name) => {
        const full = path.join(dir, name);
        return statSync(full).isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join("/")];
    });

// Токен робить посилання на ZIP придатним для прямого скачування з браузера адмінки
// (так само, як getDownloadURL у клієнтському SDK).
const downloadUrl = (objectPath, token) =>
    `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;

const setStatus = async (status, extra = {}) => {
    await buildDoc.set(
        {
            status,
            target,
            ...(commit ? { commit } : {}),
            ...(runUrl ? { runUrl } : {}),
            ...extra,
        },
        { merge: true }
    );
    console.log(`[build-publish] ${buildId}: ${status}`);
};

const publish = async () => {
    const distDir = path.join(gameDir, "dist", target);
    const files = listFiles(distDir);
    if (!files.includes("index.html")) throw new Error(`${distDir} has no index.html - did vite build run?`);

    // index.html у КОРЕНІ архіву - так вимагають портали/агрегатори.
    const zipBytes = zipSync(Object.fromEntries(files.map((file) => [file, readFileSync(path.join(distDir, file))])), {
        level: 9,
    });

    const shortCommit = commit.slice(0, 7) || "local";
    const zipPath = `game-builds/${buildId}/tic-tac-toe-${target}-${shortCommit}.zip`;
    const zipToken = randomUUID();
    await bucket.file(zipPath).save(Buffer.from(zipBytes), {
        resumable: false,
        metadata: {
            contentType: "application/zip",
            contentDisposition: `attachment; filename="${path.posix.basename(zipPath)}"`,
            metadata: { firebaseStorageDownloadTokens: zipToken },
        },
    });

    const sitePrefix = `game-builds/${buildId}/site`;
    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        await bucket.upload(path.join(distDir, file), {
            destination: `${sitePrefix}/${file}`,
            resumable: false,
            metadata: {
                contentType: CONTENT_TYPES[ext] || "application/octet-stream",
                // Vite хешує імена бандлів - їх можна кешувати назавжди; решта (index.html,
                // картинки зі сталими іменами) мусить підхоплювати новий білд одразу.
                cacheControl: file.startsWith("assets/") ? "public, max-age=31536000, immutable" : "no-cache",
            },
        });
    }

    await bucket.file("game-builds/current.json").save(JSON.stringify({ buildId, sitePrefix }), {
        resumable: false,
        metadata: { contentType: "application/json", cacheControl: "no-cache" },
    });

    await setStatus("success", {
        finishedAt: FieldValue.serverTimestamp(),
        zipPath,
        zipUrl: downloadUrl(zipPath, zipToken),
        zipSizeBytes: zipBytes.byteLength,
        fileCount: files.length,
        error: FieldValue.delete(),
    });
};

const [command, arg] = process.argv.slice(2);

try {
    if (command === "status" && arg === "building") {
        await setStatus("building", { startedAt: FieldValue.serverTimestamp() });
    } else if (command === "status" && arg === "failed") {
        await setStatus("failed", {
            finishedAt: FieldValue.serverTimestamp(),
            error: "Збірка впала - деталі в лозі GitHub Actions.",
        });
    } else if (command === "publish") {
        await publish();
    } else {
        console.error("Usage: build-publish.mjs status <building|failed> | publish");
        process.exit(1);
    }
} catch (err) {
    console.error(err);
    process.exit(1);
}
