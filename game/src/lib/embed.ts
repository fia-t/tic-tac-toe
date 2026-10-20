"use client";

// Гра, вбудована в iframe на сторонній сторінці (новина порталу): сайт /embed?skin=<id теми>.
// Лише партія з ботом заданим скіном: поле, рівень бота й модифікатор можна обирати, але
// немає меню, магазину, онлайну, нагород і переходів назовні. Вмикається один раз до першого
// рендеру гри (app/embed), далі лише читається.

export type EmbedConfig = { skinId: string };

let config: EmbedConfig | null = null;

export const setEmbed = (value: EmbedConfig): void => {
    config = value;
};

export const getEmbed = (): EmbedConfig | null => config;
export const isEmbed = (): boolean => config !== null;

// Скіни, для яких результат партії - хелловінська анімація (цукерки за перемогу, капость за
// програш). Поки лише "Осінь" (тема з адмінки).
const HALLOWEEN_SKINS = ["UPsBf1vlRn80KYgZShBM"];
export const isHalloweenEmbed = (): boolean => config !== null && HALLOWEEN_SKINS.includes(config.skinId);
