// Копіює index.<target>.html -> index.html (єдине, чим відрізняються білди per-target -
// тег SDK-скрипта в <head>) і виставляє VITE_TARGET у .env.local, не чіпаючи інші рядки
// цього файлу (там-таки можуть лежати NEXT_PUBLIC_FIREBASE_* ключі гравця).
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "..");

const VALID_TARGETS = ["crazygames", "poki", "itch"];
const target = process.argv[2];

if (!VALID_TARGETS.includes(target)) {
    console.error(`Usage: node scripts/prepare-target.mjs <${VALID_TARGETS.join("|")}>`);
    process.exit(1);
}

copyFileSync(path.join(root, `index.${target}.html`), path.join(root, "index.html"));

const envPath = path.join(root, ".env.local");
const existingLines = existsSync(envPath)
    ? readFileSync(envPath, "utf-8").split("\n").filter((line) => line.trim() && !line.startsWith("VITE_TARGET="))
    : [];
existingLines.push(`VITE_TARGET=${target}`);
writeFileSync(envPath, existingLines.join("\n") + "\n", "utf-8");

console.log(`[aggregator] Prepared build for target: ${target}`);
