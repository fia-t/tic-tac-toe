"use client";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { ALL_MODIFIERS, MODIFIERS_BY_MODE, STONES_COUNT, TIMER_SECONDS, weeklyModifier, type GameModeKey, type Modifier } from "@game/lib/modifiers";
import { DEFAULT_MODIFIER_SETTINGS, getModifierSettings, saveModifierSetting, type ModifierSettings } from "@game/lib/modifierSettings";
import { DEFAULT_CHAPTERS, getAllCampaignChapters, type CampaignChapterDef } from "@game/lib/campaignContent";
import { ModIcon } from "@game/components/GameOptions";
import { t } from "@game/lib/i18n";
import { ErrorText } from "@game/components/onlineStyles";
import { Section, SectionTitle, CheckboxLabel } from "@/app/admin/adminStyles";

// Розділ адмінки "Модифікатори": каталог усіх модифікаторів (іконка, назва, опис, на яких полях
// працює) і де вони стоять у кампанії. Тут вирішують, які модифікатори пропонувати в редакторі
// рівнів кампанії. Самі правила модифікаторів - у коді гри (modEngine.ts).

export const MODE_LABEL: Record<GameModeKey, string> = { traditional: "3×3", five: "5×5", difficult: "Гіга-поле" };

// Адмінка завжди українською (сайт стартує з uk) - назви й описи беремо зі словника гри.
export const modName = (m: Modifier | null): string => (m ? t(`modifier_${m}`) : t("modifier_none"));
const modDesc = (m: Modifier): string => t(`modifierDesc_${m}`);

const PARAMS: Partial<Record<Modifier, string>> = {
    timer: `${TIMER_SECONDS} с на хід`,
    stones: `${STONES_COUNT} камені на полі`,
    vanish: "3 фішки гравця на полі",
};

const modesOf = (m: Modifier): GameModeKey[] => (Object.keys(MODIFIERS_BY_MODE) as GameModeKey[]).filter((mode) => MODIFIERS_BY_MODE[mode].includes(m));

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
`;

const Card = styled.div<{ $off: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px;
    border-radius: 16px;
    background: #fffaf0;
    border: 2px solid ${({ $off }) => ($off ? "rgba(139, 101, 60, 0.15)" : "rgba(47, 138, 62, 0.4)")};
    opacity: ${({ $off }) => ($off ? 0.7 : 1)};
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;

    b {
        font-size: 16px;
    }
`;

export const IconBadge = styled.span`
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 12px;
    background: #f6dcae;
    color: #49301f;
`;

const Meta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 12px;
`;

const Chip = styled.span<{ $tone?: "teal" | "gold" }>`
    padding: 2px 8px;
    border-radius: 999px;
    font-weight: 700;
    background: ${({ $tone }) => ($tone === "gold" ? "rgba(245, 184, 46, 0.25)" : "rgba(31, 179, 217, 0.15)")};
    color: ${({ $tone }) => ($tone === "gold" ? "#8a5a0a" : "#0f6f8c")};
`;

const Usage = styled.div`
    font-size: 13px;
    color: #8b653c;
`;

const describeError = (fallback: string, err: unknown): string => {
    const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : null;
    console.error(fallback, err);
    return code ? `${fallback} (${code})` : fallback;
};

export const ModifiersSection: React.FC = () => {
    const [settings, setSettings] = useState<ModifierSettings | null>(null);
    const [chapters, setChapters] = useState<CampaignChapterDef[]>([]);
    const [saving, setSaving] = useState<Modifier | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getModifierSettings()
            .then(setSettings)
            .catch((err) => {
                setError(describeError("Не вдалося завантажити налаштування модифікаторів.", err));
                setSettings(DEFAULT_MODIFIER_SETTINGS);
            });
        // Поки в базі немає розділів, гра показує стандартні - їх і рахуємо.
        getAllCampaignChapters()
            .then((list) => setChapters(list.length ? list : DEFAULT_CHAPTERS))
            .catch(() => setChapters(DEFAULT_CHAPTERS));
    }, []);

    const toggleCampaign = async (m: Modifier) => {
        if (!settings) return;
        const next = { ...settings[m], campaign: !settings[m].campaign };
        setSaving(m);
        setError(null);
        try {
            await saveModifierSetting(m, next);
            setSettings({ ...settings, [m]: next });
        } catch (err) {
            setError(describeError("Не вдалося зберегти.", err));
        } finally {
            setSaving(null);
        }
    };

    const weekly = weeklyModifier();

    return (
        <Section>
            <SectionTitle>Модифікатори ({ALL_MODIFIERS.length})</SectionTitle>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#8b653c" }}>
                Правила модифікаторів - у коді гри. Тут видно, на яких полях кожен працює і де він стоїть у кампанії. Позначка «Для кампанії» вирішує, чи пропонувати
                модифікатор у редакторі рівнів (розділ «Кампанія»); рівні, де він уже стоїть, не змінюються.
            </p>
            {error && <ErrorText>{error}</ErrorText>}
            {!settings ? (
                <p>Завантаження...</p>
            ) : (
                <Grid>
                    {ALL_MODIFIERS.map((m) => {
                        const used = chapters.flatMap((chapter) =>
                            chapter.levels.flatMap((level, index) => (level.modifier === m ? [`${chapter.name} · ${index + 1}${level.boss ? " (бос)" : ""}`] : []))
                        );
                        return (
                            <Card key={m} $off={!settings[m].campaign}>
                                <Head>
                                    <IconBadge>
                                        <ModIcon id={m} size={24} />
                                    </IconBadge>
                                    <div>
                                        <b>{modName(m)}</b>
                                        <div style={{ fontSize: 12, color: "#8b653c" }}>{m}</div>
                                    </div>
                                </Head>
                                <div style={{ fontSize: 14 }}>{modDesc(m)}</div>
                                <Meta>
                                    {modesOf(m).map((mode) => (
                                        <Chip key={mode}>{MODE_LABEL[mode]}</Chip>
                                    ))}
                                    {PARAMS[m] && <Chip>{PARAMS[m]}</Chip>}
                                    {m === weekly && <Chip $tone="gold">Модифікатор цього тижня</Chip>}
                                </Meta>
                                <Usage>{used.length ? `У кампанії: ${used.join(", ")}` : "У кампанії не використовується"}</Usage>
                                <CheckboxLabel>
                                    <input type="checkbox" checked={settings[m].campaign} disabled={saving !== null} onChange={() => void toggleCampaign(m)} />
                                    Для кампанії
                                </CheckboxLabel>
                            </Card>
                        );
                    })}
                </Grid>
            )}
        </Section>
    );
};
