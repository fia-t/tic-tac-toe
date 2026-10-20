"use client";
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage, isFirebaseConfigured } from "@game/lib/firebase";
import { assetUrl } from "@game/lib/assets";
import { getLocale } from "@game/lib/i18n";
import type { Difficulty } from "@game/lib/difficulty";
import type { GameModeKey, Modifier } from "@game/lib/modifiers";

// Вміст кампанії, який редагується в адмінці (розділ "Кампанія"): розділи з фоном, босом,
// нагородою й рівнями. Зберігається в Firestore (campaignChapters), фони - у Storage
// (campaign/{chapterId}/background). Поки в базі порожньо, діють стандартні розділи нижче
// (DEFAULT_CHAPTERS) з фонами з public/images/campaign.

export type CampaignLevelDef = {
    // Стабільний id рівня - за ним зберігаються зірки гравця (не зсуваються при зміні порядку).
    id?: string;
    // Назва-ціль рівня, як її бачить гравець ("Перемога в обхід каміння").
    title: string;
    mode: GameModeKey;
    difficulty: Difficulty;
    modifier?: Modifier | null;
    // "win" - потрібна перемога; "survive" - зараховується й нічия.
    goal: "win" | "survive";
    // ★★★ - перемога не більше ніж за стільки ходів гравця (стартові фішки головоломки не рахуються).
    par: number;
    boss?: boolean;
    // Головоломка: фішки, що вже стоять на полі (індекси клітинок).
    preset?: { X: number[]; O: number[] } | null;
};

export type CampaignChapterDef = {
    id: string;
    name: string;
    subtitle: string;
    // Назва й підзаголовок англійською; порожньо - показується українська.
    nameEn: string;
    subtitleEn: string;
    // Повний URL (завантажений фон) або шлях від кореня сайту ("images/campaign/beach.jpg").
    backgroundUrl: string;
    order: number;
    active: boolean;
    bossName: string;
    bossLine: string;
    rewardCoins: number;
    // id скіна, який відкривається за проходження розділу (порожньо - без скіна).
    rewardSkinId: string;
    levels: CampaignLevelDef[];
};

const W = (title: string, mode: GameModeKey, difficulty: Difficulty, par: number, extra: Partial<CampaignLevelDef> = {}): CampaignLevelDef => ({
    title,
    mode,
    difficulty,
    par,
    goal: "win",
    ...extra,
});

export const DEFAULT_CHAPTERS: CampaignChapterDef[] = [
    {
        id: "beach",
        name: "Пляж",
        subtitle: "Класика 3×3 і перші модифікатори",
        nameEn: "Beach",
        subtitleEn: "Classic 3×3 and the first modifiers",
        backgroundUrl: "images/campaign/beach.jpg",
        order: 0,
        active: true,
        bossName: "Капітан Краб",
        bossLine: "На моєму пляжі фішки довго не живуть! Тримай не більше трьох - і не відволікайся.",
        rewardCoins: 100,
        // Вбудований скін-нагорода (CAMPAIGN_THEMES): фон поля - арт розділу.
        rewardSkinId: "sea",
        levels: [
            { ...W("Перша перемога над легким ботом", "traditional", "easy", 3), id: "beach-1" },
            { ...W("Головоломка: знайди вилку й виграй за 2 ходи", "traditional", "medium", 2, { preset: { X: [0, 4], O: [1, 8] } }), id: "beach-2" },
            { ...W("Зникаючі фішки: виграй", "traditional", "medium", 5, { modifier: "vanish" }), id: "beach-3" },
            { ...W("Таймер: перемога на швидкість", "traditional", "medium", 4, { modifier: "timer" }), id: "beach-4" },
            { ...W("Мізер проти Майстра: не склади лінію першим", "traditional", "master", 5, { modifier: "misere", goal: "survive" }), id: "beach-5" },
            { ...W("Бос: Капітан Краб", "traditional", "master", 8, { modifier: "vanish", goal: "survive", boss: true }), id: "beach-6" },
        ],
    },
    {
        id: "forest",
        name: "Ліс",
        subtitle: "Поле 5×5, чотири в ряд, кріт і каміння",
        nameEn: "Forest",
        subtitleEn: "5×5 board, four in a row, the mole and stones",
        backgroundUrl: "images/campaign/forest.jpg",
        order: 1,
        active: true,
        bossName: "Пан Кріт",
        bossLine: "Ліс - мої володіння. Де захочу, там і вирию горбок. Встигнеш оминути?",
        rewardCoins: 150,
        rewardSkinId: "forest",
        levels: [
            { ...W("4 в ряд проти легкого бота", "five", "easy", 6), id: "forest-1" },
            { ...W("Перемога в обхід каміння", "five", "medium", 7, { modifier: "stones" }), id: "forest-2" },
            { ...W("Головоломка: створи подвійну загрозу й виграй за 2 ходи", "five", "medium", 2, { preset: { X: [6, 7, 8, 12], O: [3, 5, 9, 20] } }), id: "forest-3" },
            { ...W("Кріт риє горбки: виграй", "five", "medium", 8, { modifier: "mole" }), id: "forest-4" },
            { ...W("Гравітація: збери 4", "five", "medium", 8, { modifier: "gravity" }), id: "forest-5" },
            { ...W("Бос: Пан Кріт", "five", "master", 10, { modifier: "mole", goal: "survive", boss: true }), id: "forest-6" },
        ],
    },
    {
        id: "mountains",
        name: "Гори",
        subtitle: "Гіга-поле: дев'ять полів",
        nameEn: "Mountains",
        subtitleEn: "Ultimate board: nine boards in one",
        backgroundUrl: "images/campaign/mountains.jpg",
        order: 2,
        active: true,
        bossName: "Орел-Вершина",
        bossLine: "З гори я бачу всі дев'ять полів одразу. А ти встигнеш подумати за 5 секунд?",
        rewardCoins: 250,
        rewardSkinId: "peak",
        levels: [
            { ...W("Перше гіга-поле", "difficult", "easy", 14), id: "mountains-1" },
            { ...W("Гіга-поле проти середнього бота", "difficult", "medium", 16), id: "mountains-2" },
            { ...W("Гіга-поле з таймером", "difficult", "medium", 16, { modifier: "timer" }), id: "mountains-3" },
            // Гіга-поле: індекси 0-80 (поле b, клітинка c -> b * 9 + c); виграні малі поля закриваються одразу.
            { ...W("Головоломка: знайди хід, що виграє все гіга-поле", "difficult", "medium", 1, { preset: { X: [0, 1, 2, 36, 37, 38, 72, 78], O: [18, 19, 20, 54, 55, 56, 80, 44] } }), id: "mountains-4" },
            { ...W("Майстер на гіга-полі: не програй", "difficult", "master", 18, { goal: "survive" }), id: "mountains-5" },
            { ...W("Бос: Орел-Вершина", "difficult", "master", 20, { modifier: "timer", goal: "survive", boss: true }), id: "mountains-6" },
        ],
    },
];

// Назва й підзаголовок розділу мовою гри.
export const chapterName = (chapter: Pick<CampaignChapterDef, "name" | "nameEn">): string => (getLocale() === "en" && chapter.nameEn) || chapter.name;
export const chapterSubtitle = (chapter: Pick<CampaignChapterDef, "subtitle" | "subtitleEn">): string =>
    (getLocale() === "en" && chapter.subtitleEn) || chapter.subtitle;

// Фон для <img>/CSS: завантажений файл - як є, стандартний - від кореня сайту чи білду гри.
export const chapterBackground = (chapter: Pick<CampaignChapterDef, "backgroundUrl">): string =>
    /^https?:\/\//.test(chapter.backgroundUrl) ? chapter.backgroundUrl : assetUrl(chapter.backgroundUrl);

const COLLECTION = "campaignChapters";

const toLevel = (raw: Record<string, unknown>, fallbackId: string): CampaignLevelDef => ({
    id: typeof raw.id === "string" && raw.id ? raw.id : fallbackId,
    title: String(raw.title ?? ""),
    mode: (["traditional", "five", "difficult"] as const).includes(raw.mode as GameModeKey) ? (raw.mode as GameModeKey) : "traditional",
    difficulty: (["easy", "medium", "master"] as const).includes(raw.difficulty as Difficulty) ? (raw.difficulty as Difficulty) : "easy",
    modifier: (raw.modifier as Modifier) || null,
    goal: raw.goal === "survive" ? "survive" : "win",
    par: typeof raw.par === "number" && raw.par > 0 ? Math.floor(raw.par) : 5,
    boss: raw.boss === true,
    preset: raw.preset && typeof raw.preset === "object" ? (raw.preset as CampaignLevelDef["preset"]) : null,
});

const toChapter = (id: string, raw: Record<string, unknown>): CampaignChapterDef => ({
    id,
    name: String(raw.name ?? ""),
    subtitle: String(raw.subtitle ?? ""),
    nameEn: String(raw.nameEn ?? ""),
    subtitleEn: String(raw.subtitleEn ?? ""),
    backgroundUrl: String(raw.backgroundUrl ?? ""),
    order: typeof raw.order === "number" ? raw.order : 0,
    active: raw.active !== false,
    bossName: String(raw.bossName ?? ""),
    bossLine: String(raw.bossLine ?? ""),
    rewardCoins: typeof raw.rewardCoins === "number" ? raw.rewardCoins : 0,
    rewardSkinId: String(raw.rewardSkinId ?? ""),
    levels: Array.isArray(raw.levels) ? raw.levels.map((level, index) => toLevel(level as Record<string, unknown>, `${id}-${index + 1}`)) : [],
});

// Для гри: активні розділи з бази, а якщо там порожньо чи помилка - стандартні.
export const getCampaignChapters = async (): Promise<CampaignChapterDef[]> => {
    if (!isFirebaseConfigured) return DEFAULT_CHAPTERS;
    try {
        const chapters = await getAllCampaignChapters();
        const active = chapters.filter((chapter) => chapter.active && chapter.levels.length > 0);
        return active.length ? active : DEFAULT_CHAPTERS;
    } catch {
        return DEFAULT_CHAPTERS;
    }
};

// --- Адмінські операції (запис дозволений лише isAdmin() у Security Rules) ---

export const getAllCampaignChapters = async (): Promise<CampaignChapterDef[]> => {
    const snap = await getDocs(collection(getFirebaseDb(), COLLECTION));
    return snap.docs.map((d) => toChapter(d.id, d.data())).sort((a, b) => a.order - b.order);
};

// Firestore не приймає undefined - прибираємо порожні необов'язкові поля рівнів.
const cleanLevel = (level: CampaignLevelDef, index: number, chapterId: string) => ({
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

export const saveCampaignChapter = async (chapter: CampaignChapterDef): Promise<void> => {
    const { id, ...data } = chapter;
    await setDoc(doc(getFirebaseDb(), COLLECTION, id), { ...data, levels: data.levels.map((level, index) => cleanLevel(level, index, id)), updatedAt: serverTimestamp() });
};

export const createCampaignChapterId = (): string => doc(collection(getFirebaseDb(), COLLECTION)).id;

export const deleteCampaignChapter = async (chapterId: string): Promise<void> => {
    await deleteDoc(doc(getFirebaseDb(), COLLECTION, chapterId));
    try {
        await deleteObject(ref(getFirebaseStorage(), `campaign/${chapterId}/background`));
    } catch {
        // фону могло не бути (стандартний) - це нормально
    }
};

// Як і з темами: старий файл видаляємо перед завантаженням, щоб змінився токен і URL (кеш браузера).
export const uploadChapterBackground = async (chapterId: string, file: File): Promise<string> => {
    const storageRef = ref(getFirebaseStorage(), `campaign/${chapterId}/background`);
    try {
        await deleteObject(storageRef);
    } catch {
        // першого фону ще не було
    }
    await uploadBytes(storageRef, file, { contentType: file.type });
    return getDownloadURL(storageRef);
};
