import type { AggregatorSdk } from "./types";
import { crazyGamesSdk } from "./crazygames";
import { pokiSdk } from "./poki";
import { noneSdk } from "./none";

// Підставляється game/vite.config.ts з --mode білду.
const target = process.env.GAME_TARGET ?? "portal";

const adapters: Record<string, AggregatorSdk> = {
    crazygames: crazyGamesSdk,
    poki: pokiSdk,
    itch: noneSdk,
    // Портал (Playwire) показує рекламу сам - через PortalGameBridge, не через SDK тут.
    portal: noneSdk,
};

export const sdk: AggregatorSdk = adapters[target] ?? noneSdk;
