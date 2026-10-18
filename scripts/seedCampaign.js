#!/usr/bin/env node
/**
 * Заносить стандартні розділи кампанії (DEFAULT_CHAPTERS з game/src/lib/campaignContent.ts)
 * у Firestore-колекцію campaignChapters - після цього їх видно й можна редагувати в адмінці
 * ("Кампанія"). Фони лишаються вбудованими (public/images/campaign), скіни-нагороди -
 * вбудовані скіни кампанії (CAMPAIGN_THEMES у game/src/lib/themes.ts).
 *
 * Запуск (з кореня tictactoe-game/tictactoe-game):
 *   node scripts/seedCampaign.js          - додає лише розділи, яких ще немає в базі
 *   node scripts/seedCampaign.js --force  - перезаписує й наявні (правки з адмінки зникнуть)
 *
 * Облікові дані - як у setAdminClaim.js: Application Default Credentials
 * (gcloud auth application-default login), див. scripts/README.md.
 */

const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");
const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const ROOT = path.join(__dirname, "..");
const DATABASE_ID = "tic-tac-toe";
const force = process.argv.includes("--force");

function resolveProjectId() {
    const fromEnv = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
    if (fromEnv) return fromEnv;
    try {
        const content = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
        const match = content.match(/^NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.+)$/m);
        if (match) return match[1].trim();
    } catch {
        // .env.local відсутній - нехай Admin SDK спробує визначити проєкт сам
    }
    return undefined;
}

// Дані розділів беремо прямо з коду гри (TypeScript) - збираємо їх esbuild-ом у пам'яті.
async function loadDefaultChapters() {
    const result = await esbuild.build({
        stdin: { contents: 'export { DEFAULT_CHAPTERS } from "@game/lib/campaignContent";', resolveDir: ROOT, loader: "ts" },
        bundle: true,
        write: false,
        platform: "node",
        format: "cjs",
        alias: { "@game": path.join(ROOT, "game", "src") },
        external: ["firebase/*"],
        logLevel: "silent",
    });
    const module = { exports: {} };
    new Function("module", "exports", "require", result.outputFiles[0].text)(module, module.exports, require);
    return module.exports.DEFAULT_CHAPTERS;
}

// Як cleanLevel у campaignContent.ts: Firestore не приймає undefined.
const cleanLevel = (level, index, chapterId) => ({
    id: level.id || `${chapterId}-${index + 1}`,
    title: level.title,
    mode: level.mode,
    difficulty: level.difficulty,
    modifier: level.modifier ?? null,
    goal: level.goal,
    par: level.par,
    boss: Boolean(level.boss),
    preset: level.preset ?? null,
});

async function main() {
    const projectId = resolveProjectId();
    const app = admin.initializeApp({ credential: admin.credential.applicationDefault(), ...(projectId ? { projectId } : {}) });
    const db = getFirestore(app, DATABASE_ID);
    console.log(`Firebase project: ${projectId}, база: ${DATABASE_ID}`);

    const chapters = await loadDefaultChapters();
    for (const chapter of chapters) {
        const { id, ...data } = chapter;
        const ref = db.collection("campaignChapters").doc(id);
        if (!force && (await ref.get()).exists) {
            console.log(`- ${id} (${chapter.name}): уже є в базі, пропущено`);
            continue;
        }
        await ref.set({ ...data, levels: data.levels.map((level, index) => cleanLevel(level, index, id)), updatedAt: FieldValue.serverTimestamp() });
        console.log(`+ ${id} (${chapter.name}): ${data.levels.length} рівнів, нагорода ${data.rewardCoins} монет, скін "${data.rewardSkinId}"`);
    }
}

main().catch((err) => {
    console.error("Не вдалося записати розділи:", err.message);
    process.exit(1);
});
