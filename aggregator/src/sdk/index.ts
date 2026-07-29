import type { AggregatorSdk } from "./types";
import { crazyGamesSdk } from "./crazygames";
import { pokiSdk } from "./poki";
import { noneSdk } from "./none";

const target = import.meta.env.VITE_TARGET ?? "itch";

const adapters: Record<string, AggregatorSdk> = {
    crazygames: crazyGamesSdk,
    poki: pokiSdk,
    itch: noneSdk,
};

export const sdk: AggregatorSdk = adapters[target] ?? noneSdk;
