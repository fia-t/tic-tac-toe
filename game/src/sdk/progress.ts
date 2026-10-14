import { sdk } from "./index";

// Загальна статистика гравця в хмарних збереженнях порталу (data.setItem, ліміт 1 МБ -
// тут кілька байт) + "рівень" для порталу. Рівнів у грі немає, тож рівень = кількість
// перемог: число, що лише зростає з прогресом (як радить документація reportPlayerLevel).
// На агрегаторах без збережень (loadData/saveData не реалізовані) - тихий no-op.

type Stats = { wins: number; games: number };

const STATS_KEY = "stats";

let stats: Stats = { wins: 0, games: 0 };
let loading: Promise<void> = Promise.resolve();

const toCount = (value: unknown): number =>
    typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;

const load = async () => {
    const saved = await sdk.loadData?.<Partial<Stats>>(STATS_KEY);
    stats = { wins: toCount(saved?.wins), games: toCount(saved?.games) };
    sdk.reportPlayerLevel?.(stats.wins);
};

export const progress = {
    // Також після входу/виходу на порталі: гостьові дані переносяться в акаунт, а гостю
    // рівень не зберігається - тож перечитуємо і відправляємо рівень повторно.
    reload: () => {
        loading = load();
        return loading;
    },
    record: async (result: "win" | "lose" | "draw") => {
        await loading;
        stats = { wins: stats.wins + (result === "win" ? 1 : 0), games: stats.games + 1 };
        sdk.reportPlayerLevel?.(stats.wins);
        await sdk.saveData?.(STATS_KEY, stats);
    },
    get: (): Stats => stats,
};
