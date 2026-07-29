import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Ті самі NEXT_PUBLIC_FIREBASE_* назви, що й у .env.local основного Next-застосунку -
// app/lib/firebase.ts (перевикористаний тут напряму через "@/lib/firebase") читає їх
// через process.env.*, якого в браузерному Vite-білді нема - тому підставляємо значення
// на етапі збірки через define. Скопіюйте значення зі свого .env.local в aggregator/.env.local.
const FIREBASE_ENV_KEYS = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
    "NEXT_PUBLIC_FIRESTORE_DATABASE_ID",
];

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, dirname, "");
    const target = env.VITE_TARGET || "crazygames";

    const define: Record<string, string> = {};
    for (const key of FIREBASE_ENV_KEYS) {
        define[`process.env.${key}`] = JSON.stringify(env[key] ?? "");
    }

    return {
        // Відносні шляхи до асетів - обов'язково, агрегатор віддає гру з довільного
        // піддомену/шляху всередині iframe, абсолютні "/assets/..." шляхи там не працюють.
        base: "./",
        plugins: [react()],
        resolve: {
            alias: {
                // Той самий "@/*" -> корінь Next-застосунку, що й у tsconfig.json основного
                // проєкту - усі "@/app/..." імпорти в перевикористаних файлах резолвляться
                // без жодних правок імпортів.
                "@": path.resolve(dirname, "../"),
            },
        },
        define,
        build: {
            outDir: `dist/${target}`,
            emptyOutDir: true,
        },
    };
});
