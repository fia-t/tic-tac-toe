import type { AggregatorSdk } from "./types";
import { crazyGamesSdk } from "./crazygames";
import { pokiSdk } from "./poki";
import { noneSdk } from "./none";
import { qsplaySdk } from "./qsplay";

// Підставляється game/vite.config.ts з --mode білду.
const target = process.env.GAME_TARGET ?? "portal";

const adapters: Record<string, AggregatorSdk> = {
    crazygames: crazyGamesSdk,
    poki: pokiSdk,
    itch: noneSdk,
    // Портал play.quartsoft.com - QSPlay SDK (lifecycle, збереження, інвайти). Рекламу
    // портал показує сам - через PortalGameBridge, не через SDK тут.
    portal: qsplaySdk,
};

export const sdk: AggregatorSdk = adapters[target] ?? noneSdk;
