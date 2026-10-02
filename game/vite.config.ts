import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const gameDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(gameDir, "..");

// Ціль білду = Vite mode: `vite build --mode portal|crazygames|poki|itch`.
// Від неї залежать лише тег SDK-скрипта в <head> і адаптер із src/sdk/.
const TARGETS = ["portal", "crazygames", "poki", "itch"] as const;
type Target = (typeof TARGETS)[number];

const SDK_SCRIPTS: Record<Target, string> = {
    portal: "",
    itch: "",
    // CrazyGames HTML5 v2 SDK - https://docs.crazygames.com/sdk/html5-v2/intro/
    crazygames: '<script src="https://sdk.crazygames.com/crazygames-sdk-v2.js"></script>',
    // Poki HTML5 SDK - https://sdk.poki.com/html5
    poki: '<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>',
};

// Ігровий код (game/src) спільний із Next.js-сайтом і читає конфіг через
// process.env.NEXT_PUBLIC_* - у Vite-білді process.env нема, тож значення
// підставляються на етапі збірки з того самого кореневого .env.local (або з env
// CI-середовища - loadEnv з префіксом "" бачить і process.env).
const INLINED_ENV_KEYS = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
    "NEXT_PUBLIC_FIRESTORE_DATABASE_ID",
    "NEXT_PUBLIC_PORTAL_ORIGIN",
    "NEXT_PUBLIC_SITE_URL",
];

const sdkScriptPlugin = (target: Target): Plugin => ({
    name: "game-sdk-script",
    transformIndexHtml: (html) => html.replace("<!--SDK_SCRIPT-->", SDK_SCRIPTS[target]),
});

// Кореневий public/ спільний із сайтом (images/, icons/), але sw.js - це service
// worker саме Next-сайту, у ZIP для порталу йому не місце.
const dropSiteOnlyFilesPlugin = (outDir: string): Plugin => ({
    name: "game-drop-site-only-files",
    apply: "build",
    closeBundle() {
        rmSync(path.join(outDir, "sw.js"), { force: true });
    },
});

export default defineConfig(({ mode }) => {
    const target: Target = (TARGETS as readonly string[]).includes(mode) ? (mode as Target) : "portal";
    const env = loadEnv(mode, projectRoot, "");
    const outDir = path.join(gameDir, "dist", target);

    const define: Record<string, string> = {
        "process.env.GAME_TARGET": JSON.stringify(target),
        // Відносні шляхи до картинок - гра живе в довільній підпапці порталу.
        "process.env.NEXT_PUBLIC_GAME_ASSET_BASE": JSON.stringify("./"),
    };
    for (const key of INLINED_ENV_KEYS) {
        define[`process.env.${key}`] = JSON.stringify(env[key] ?? "");
    }

    return {
        root: gameDir,
        // Відносні шляхи до бандлів - агрегатор/портал віддає гру з довільного шляху.
        base: "./",
        publicDir: path.join(projectRoot, "public"),
        envDir: projectRoot,
        plugins: [react(), sdkScriptPlugin(target), dropSiteOnlyFilesPlugin(outDir)],
        resolve: {
            alias: {
                "@game": path.join(gameDir, "src"),
            },
            // Один React на весь бандл - навіть якщо колись з'явиться вкладений node_modules.
            dedupe: ["react", "react-dom", "styled-components"],
        },
        define,
        build: {
            outDir,
            emptyOutDir: true,
        },
    };
});
