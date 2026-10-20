"use client";
import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import {
    CampaignChapterDef,
    CampaignLevelDef,
    DEFAULT_CHAPTERS,
    chapterBackground,
    createCampaignChapterId,
    deleteCampaignChapter,
    getAllCampaignChapters,
    saveCampaignChapter,
    uploadChapterBackground,
} from "@game/lib/campaignContent";
import { MODIFIERS_BY_MODE, type GameModeKey } from "@game/lib/modifiers";
import { DEFAULT_MODIFIER_SETTINGS, getModifierSettings, type ModifierSettings } from "@game/lib/modifierSettings";
import { ModIcon } from "@game/components/GameOptions";
import { albumArt } from "@game/components/AlbumArt";
import { BossPortrait } from "@game/components/CampaignArt";
import { t } from "@game/lib/i18n";
import type { Difficulty } from "@game/lib/difficulty";
import { CAMPAIGN_THEMES, getAllThemes } from "@game/lib/themes";
import { PillButton, TextInput, ErrorText } from "@game/components/onlineStyles";
import { MODE_LABEL, modName } from "@/app/admin/sections/ModifiersSection";
import { Section, SectionTitle, SmallLabel, FileInput, CheckboxLabel, DangerButton, GhostButton, AddThemeRow, EmptyState } from "@/app/admin/adminStyles";

// Розділ адмінки "Кампанія": розділи (фон, назва, бос, нагорода) і їхні рівні. Поки в базі
// нічого немає, гра бере стандартні розділи - їх можна одним натиском занести в базу й далі
// редагувати.

const DIFF_LABEL: Record<Difficulty, string> = { easy: "Легкий", medium: "Середній", master: "Майстер" };

const ChapterCard = styled.div<{ $active: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: 16px;
    background: #fffaf0;
    border: 2px solid ${({ $active }) => ($active ? "rgba(47, 138, 62, 0.45)" : "rgba(139, 101, 60, 0.2)")};
`;

const Head = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
    gap: 16px;

    @media (max-width: 760px) {
        grid-template-columns: 1fr;
    }
`;

const Cover = styled.div<{ $src: string }>`
    aspect-ratio: 16 / 9;
    border-radius: 12px;
    background: ${({ $src }) => ($src ? `url("${$src}") center/cover no-repeat` : "rgba(139, 101, 60, 0.1)")};
    border: 1px solid rgba(139, 101, 60, 0.2);
`;

const Fields = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;

    @media (max-width: 560px) {
        grid-template-columns: 1fr;
    }
`;

const Wide = styled(SmallLabel)`
    grid-column: 1 / -1;
`;

const Select = styled.select`
    width: 100%;
    min-width: 112px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 2px solid rgba(139, 101, 60, 0.25);
    background: #fffaf0;
    color: #5b3f22;
    font-size: 14px;
`;

const LevelTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;

    th {
        text-align: left;
        font-size: 12px;
        color: #8b653c;
        padding: 4px 6px;
    }

    td {
        padding: 4px 6px;
        border-top: 1px solid rgba(139, 101, 60, 0.15);
        vertical-align: middle;
    }

    input[type="text"],
    input[type="number"] {
        width: 100%;
        padding: 6px 8px;
        border-radius: 8px;
        border: 2px solid rgba(139, 101, 60, 0.25);
        background: #fffaf0;
        font-size: 14px;
    }
`;

const TableScroll = styled.div`
    overflow-x: auto;
`;

const Row = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
`;

const Tag = styled.span`
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(31, 179, 217, 0.15);
    color: #0f6f8c;
    font-size: 12px;
    font-weight: 700;
`;

// Галерея фонів: мініатюри-кнопки, вибрана - з зеленою рамкою.
const Gallery = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const GalleryItem = styled.button<{ $src: string; $selected: boolean }>`
    width: 72px;
    aspect-ratio: 16 / 9;
    padding: 0;
    border-radius: 8px;
    cursor: pointer;
    background: url("${({ $src }) => $src}") center/cover no-repeat;
    border: 3px solid ${({ $selected }) => ($selected ? "#2f8a3e" : "transparent")};
    box-shadow: 0 0 0 1px rgba(139, 101, 60, 0.25);

    &:disabled {
        cursor: default;
        opacity: 0.6;
    }
`;

// Вибір модифікатора рівня - ряд іконок (як у грі), назва в підказці.
const ModPick = styled.div`
    display: flex;
    gap: 4px;
`;

const ModPickButton = styled.button<{ $selected: boolean; $warn?: boolean }>`
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 9px;
    cursor: pointer;
    color: ${({ $selected }) => ($selected ? "#fff7e8" : "#49301f")};
    background: ${({ $selected, $warn }) => ($selected ? ($warn ? "#b8382a" : "#0f6f8c") : "#f6dcae")};
    border: none;

    &:disabled {
        cursor: default;
        opacity: ${({ $selected }) => ($selected ? 1 : 0.5)};
    }
`;

// Превʼю карток альбому розділу - так, як їх бачить гравець, коли картку отримано.
const AlbumRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
`;

const AlbumTile = styled.div<{ $gold: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 124px;
    padding: 8px 8px 10px;
    border-radius: 16px;
    text-align: center;
    color: #49301f;
    background: ${({ $gold }) => ($gold ? "linear-gradient(160deg, #ffe7a0, #f5c04a)" : "#fff2dc")};
    box-shadow: ${({ $gold }) => ($gold ? "inset 0 0 0 2px #d9a12a" : "inset 0 0 0 2px #ebcb98")};

    b {
        font-size: 13px;
        line-height: 1.1;
    }

    small {
        font-size: 11px;
        line-height: 1.2;
        color: #8b653c;
    }
`;

const AlbumArtBox = styled.div<{ $src?: string }>`
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 12px;
    overflow: hidden;
    background: ${({ $src }) => ($src ? `url("${$src}") center / cover no-repeat` : "#fff8ec")};
`;

// Дії з рівнем (вище / нижче / видалити) - у випадному меню "⋯". Меню з position: fixed, бо
// таблиця рівнів прокручується вбік і обрізала б звичайний випадний список.
const ActionsButton = styled.button`
    width: 34px;
    height: 32px;
    border: none;
    border-radius: 9px;
    background: rgba(139, 101, 60, 0.12);
    color: #5b3f22;
    font-size: 18px;
    font-weight: 800;
    line-height: 1;
    cursor: pointer;

    &[aria-expanded="true"],
    &:hover {
        background: rgba(139, 101, 60, 0.25);
    }
`;

const ActionsMenu = styled.div`
    position: fixed;
    z-index: 50;
    min-width: 170px;
    padding: 6px;
    border-radius: 12px;
    background: #fffaf0;
    box-shadow: 0 8px 22px rgba(70, 40, 10, 0.22);
    display: flex;
    flex-direction: column;

    button {
        padding: 8px 10px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: #5b3f22;
        font-size: 14px;
        text-align: left;
        cursor: pointer;
    }

    button:hover:not(:disabled) {
        background: rgba(139, 101, 60, 0.12);
    }

    button:disabled {
        opacity: 0.4;
        cursor: default;
    }

    button[data-danger] {
        color: #b8382a;
    }
`;

const LevelActions: React.FC<{ disabled: boolean; first: boolean; last: boolean; onUp: () => void; onDown: () => void; onDelete: () => void }> = ({
    disabled,
    first,
    last,
    onUp,
    onDown,
    onDelete,
}) => {
    const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!pos) return;
        const close = () => setPos(null);
        const onPointer = (e: PointerEvent) => {
            const target = e.target as Node;
            if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                close();
                buttonRef.current?.focus();
            }
        };
        document.addEventListener("pointerdown", onPointer);
        document.addEventListener("keydown", onKey);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            document.removeEventListener("pointerdown", onPointer);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, [pos]);

    const toggle = () => {
        if (pos) return setPos(null);
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    };
    const act = (action: () => void) => () => {
        setPos(null);
        action();
    };

    return (
        <>
            <ActionsButton ref={buttonRef} type="button" disabled={disabled} aria-haspopup="menu" aria-expanded={Boolean(pos)} aria-label="Дії з рівнем" title="Дії" onClick={toggle}>
                ⋯
            </ActionsButton>
            {pos && (
                <ActionsMenu ref={menuRef} role="menu" style={{ top: pos.top, right: pos.right }}>
                    <button type="button" role="menuitem" disabled={first} onClick={act(onUp)}>
                        ↑ Перемістити вище
                    </button>
                    <button type="button" role="menuitem" disabled={last} onClick={act(onDown)}>
                        ↓ Перемістити нижче
                    </button>
                    <button type="button" role="menuitem" data-danger onClick={act(onDelete)}>
                        ✕ Видалити рівень
                    </button>
                </ActionsMenu>
            )}
        </>
    );
};

const ALBUM_KINDS = ["done", "boss", "gold"] as const;

const AlbumPreview: React.FC<{ chapter: CampaignChapterDef }> = ({ chapter }) => (
    <AlbumRow>
        {ALBUM_KINDS.map((kind) => {
            // Як у грі (CampaignMap): анімована сцена, а для розділів без неї - фон розділу чи портрет боса.
            const scene = albumArt(chapter.id, kind);
            const name = kind === "boss" ? chapter.bossName || t("campaignBoss") : kind === "gold" ? t("albumGold", { name: chapter.name }) : chapter.name;
            return (
                <AlbumTile key={kind} $gold={kind === "gold"}>
                    {scene ? (
                        <AlbumArtBox dangerouslySetInnerHTML={{ __html: scene }} />
                    ) : kind === "boss" ? (
                        <AlbumArtBox>
                            <BossPortrait chapterId={chapter.id} size={84} />
                        </AlbumArtBox>
                    ) : (
                        <AlbumArtBox $src={chapter.backgroundUrl ? chapterBackground(chapter) : ""} />
                    )}
                    <b>{name || "Без назви"}</b>
                    <small>{t(`albumNeed_${kind}`)}</small>
                </AlbumTile>
            );
        })}
    </AlbumRow>
);

const describeError = (fallback: string, err: unknown): string => {
    const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : null;
    console.error(fallback, err);
    return code ? `${fallback} (${code})` : fallback;
};

const NEW_LEVEL: CampaignLevelDef = { title: "Новий рівень", mode: "traditional", difficulty: "easy", modifier: null, goal: "win", par: 4 };

const ChapterEditor: React.FC<{
    chapter: CampaignChapterDef;
    onSaved: () => Promise<void>;
    // Фони, з яких можна вибрати: вбудовані арти + завантажені для інших розділів.
    gallery: string[];
    modSettings: ModifierSettings;
    readOnly?: boolean;
}> = ({ chapter, onSaved, gallery, modSettings, readOnly = false }) => {
    const [draft, setDraft] = useState<CampaignChapterDef>(chapter);
    // Скіни для нагороди: вбудовані скіни кампанії + теми з розділу "Теми".
    const [skins, setSkins] = useState<{ id: string; name: string }[]>(CAMPAIGN_THEMES);
    useEffect(() => {
        getAllThemes()
            .then((themes) => setSkins([...CAMPAIGN_THEMES, ...themes.filter((theme) => !CAMPAIGN_THEMES.some((item) => item.id === theme.id))]))
            .catch(() => undefined);
    }, []);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dirty = JSON.stringify(draft) !== JSON.stringify(chapter);

    useEffect(() => setDraft(chapter), [chapter]);

    const set = <K extends keyof CampaignChapterDef>(key: K, value: CampaignChapterDef[K]) => setDraft((d) => ({ ...d, [key]: value }));
    const setLevel = (index: number, patch: Partial<CampaignLevelDef>) =>
        setDraft((d) => ({ ...d, levels: d.levels.map((level, i) => (i === index ? { ...level, ...patch } : level)) }));
    const moveLevel = (index: number, delta: number) =>
        setDraft((d) => {
            const levels = d.levels.slice();
            const target = index + delta;
            if (target < 0 || target >= levels.length) return d;
            [levels[index], levels[target]] = [levels[target], levels[index]];
            return { ...d, levels };
        });

    const run = async (label: string, action: () => Promise<void>) => {
        setBusy(true);
        setError(null);
        try {
            await action();
            await onSaved();
        } catch (err) {
            setError(describeError(label, err));
        } finally {
            setBusy(false);
        }
    };

    const disabled = busy || readOnly;

    return (
        <ChapterCard $active={draft.active}>
            <Head>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Cover $src={draft.backgroundUrl ? chapterBackground(draft) : ""} title="Фон розділу" />
                    {!readOnly && (
                        <SmallLabel as="div">
                            Картинка розділу - вибрати з наявних
                            <Gallery>
                                {gallery.map((url) => (
                                    <GalleryItem
                                        key={url}
                                        type="button"
                                        $src={chapterBackground({ backgroundUrl: url })}
                                        $selected={draft.backgroundUrl === url}
                                        disabled={disabled}
                                        title={url.startsWith("images/") ? url.replace(/^.*\//, "") : "Завантажена картинка"}
                                        onClick={() => set("backgroundUrl", url)}
                                    />
                                ))}
                            </Gallery>
                        </SmallLabel>
                    )}
                    {!readOnly && (
                        <SmallLabel>
                            Або завантажити нову (16:9, напр. 1600×900)
                            <FileInput
                                type="file"
                                accept="image/*"
                                disabled={disabled}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = "";
                                    if (!file) return;
                                    void run("Не вдалося завантажити фон.", async () => {
                                        const url = await uploadChapterBackground(draft.id, file);
                                        await saveCampaignChapter({ ...draft, backgroundUrl: url });
                                    });
                                }}
                            />
                        </SmallLabel>
                    )}
                </div>
                <Fields>
                    <SmallLabel>
                        Назва розділу
                        <TextInput value={draft.name} disabled={disabled} onChange={(e) => set("name", e.target.value)} />
                    </SmallLabel>
                    <SmallLabel>
                        Порядок (менше - раніше)
                        <TextInput type="number" value={draft.order} disabled={disabled} onChange={(e) => set("order", Number(e.target.value) || 0)} />
                    </SmallLabel>
                    <Wide>
                        Підзаголовок
                        <TextInput value={draft.subtitle} disabled={disabled} onChange={(e) => set("subtitle", e.target.value)} />
                    </Wide>
                    <SmallLabel>
                        Назва англійською
                        <TextInput value={draft.nameEn} placeholder="English name" disabled={disabled} onChange={(e) => set("nameEn", e.target.value)} />
                    </SmallLabel>
                    <SmallLabel>
                        Підзаголовок англійською
                        <TextInput value={draft.subtitleEn} placeholder="English subtitle" disabled={disabled} onChange={(e) => set("subtitleEn", e.target.value)} />
                    </SmallLabel>
                    <SmallLabel>
                        Бос - імʼя
                        <TextInput value={draft.bossName} disabled={disabled} onChange={(e) => set("bossName", e.target.value)} />
                    </SmallLabel>
                    <SmallLabel>
                        Нагорода: монети
                        <TextInput type="number" min={0} value={draft.rewardCoins} disabled={disabled} onChange={(e) => set("rewardCoins", Math.max(0, Number(e.target.value) || 0))} />
                    </SmallLabel>
                    <Wide>
                        Бос - фраза перед боєм
                        <TextInput value={draft.bossLine} disabled={disabled} onChange={(e) => set("bossLine", e.target.value)} />
                    </Wide>
                    <SmallLabel>
                        Бос - імʼя англійською
                        <TextInput value={draft.bossNameEn} placeholder="Boss name" disabled={disabled} onChange={(e) => set("bossNameEn", e.target.value)} />
                    </SmallLabel>
                    <SmallLabel>
                        Бос - фраза англійською
                        <TextInput value={draft.bossLineEn} placeholder="Boss line" disabled={disabled} onChange={(e) => set("bossLineEn", e.target.value)} />
                    </SmallLabel>
                    <SmallLabel>
                        Нагорода: скін
                        <Select value={draft.rewardSkinId} disabled={disabled} onChange={(e) => set("rewardSkinId", e.target.value)}>
                            <option value="">Без скіна</option>
                            {skins.map((skin) => (
                                <option key={skin.id} value={skin.id}>
                                    {skin.name || skin.id}
                                    {CAMPAIGN_THEMES.some((item) => item.id === skin.id) ? " (скін кампанії)" : ""}
                                </option>
                            ))}
                            {draft.rewardSkinId && !skins.some((skin) => skin.id === draft.rewardSkinId) && <option value={draft.rewardSkinId}>{draft.rewardSkinId} (немає такої теми)</option>}
                        </Select>
                    </SmallLabel>
                    <CheckboxLabel style={{ alignSelf: "end" }}>
                        <input type="checkbox" checked={draft.active} disabled={disabled} onChange={() => set("active", !draft.active)} />
                        Активний (видно в грі)
                    </CheckboxLabel>
                </Fields>
            </Head>

            <TableScroll>
                <LevelTable>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th style={{ minWidth: 220 }}>Назва-ціль</th>
                            <th>Поле</th>
                            <th>Бот</th>
                            <th title="Список модифікаторів для кампанії налаштовується в розділі «Модифікатори»">Модифікатор</th>
                            <th>Зарахування</th>
                            <th title="★★★ - перемога не більше ніж за стільки ходів">Ходів на ★★★</th>
                            <th>Бос</th>
                            <th aria-label="Дії" />
                        </tr>
                    </thead>
                    <tbody>
                        {draft.levels.map((level, index) => (
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td>
                                    <input type="text" value={level.title} disabled={disabled} onChange={(e) => setLevel(index, { title: e.target.value })} />
                                    <input
                                        type="text"
                                        value={level.titleEn ?? ""}
                                        placeholder="English"
                                        aria-label="Назва-ціль англійською"
                                        disabled={disabled}
                                        style={{ marginTop: 4 }}
                                        onChange={(e) => setLevel(index, { titleEn: e.target.value })}
                                    />
                                    {level.preset && (
                                        <Row style={{ marginTop: 4 }}>
                                            <Tag>Головоломка: фішки на старті</Tag>
                                            {!readOnly && (
                                                <GhostButton type="button" disabled={disabled} onClick={() => setLevel(index, { preset: null })}>
                                                    прибрати
                                                </GhostButton>
                                            )}
                                        </Row>
                                    )}
                                </td>
                                <td>
                                    <Select
                                        value={level.mode}
                                        disabled={disabled}
                                        onChange={(e) => {
                                            const mode = e.target.value as GameModeKey;
                                            const modifier = level.modifier && MODIFIERS_BY_MODE[mode].includes(level.modifier) ? level.modifier : null;
                                            setLevel(index, { mode, modifier, preset: null });
                                        }}
                                    >
                                        {(Object.keys(MODE_LABEL) as GameModeKey[]).map((mode) => (
                                            <option key={mode} value={mode}>
                                                {MODE_LABEL[mode]}
                                            </option>
                                        ))}
                                    </Select>
                                </td>
                                <td>
                                    <Select value={level.difficulty} disabled={disabled} onChange={(e) => setLevel(index, { difficulty: e.target.value as Difficulty })}>
                                        {(Object.keys(DIFF_LABEL) as Difficulty[]).map((d) => (
                                            <option key={d} value={d}>
                                                {DIFF_LABEL[d]}
                                            </option>
                                        ))}
                                    </Select>
                                </td>
                                <td>
                                    <ModPick role="radiogroup" aria-label="Модифікатор рівня">
                                        {[null, ...MODIFIERS_BY_MODE[level.mode].filter((m) => modSettings[m].campaign || m === level.modifier)].map((m) => {
                                            // Модифікатор вимкнено для кампанії в розділі "Модифікатори", але на рівні він уже стоїть.
                                            const off = m !== null && !modSettings[m].campaign;
                                            return (
                                                <ModPickButton
                                                    key={m ?? "none"}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={level.modifier === m || (!level.modifier && m === null)}
                                                    $selected={level.modifier === m || (!level.modifier && m === null)}
                                                    $warn={off}
                                                    disabled={disabled}
                                                    title={modName(m) + (off ? " (вимкнено для кампанії)" : "")}
                                                    onClick={() => setLevel(index, { modifier: m })}
                                                >
                                                    <ModIcon id={m} size={18} />
                                                </ModPickButton>
                                            );
                                        })}
                                    </ModPick>
                                    <div style={{ fontSize: 11, color: "#8b653c", marginTop: 2, whiteSpace: "nowrap" }}>{modName(level.modifier ?? null)}</div>
                                </td>
                                <td>
                                    <Select value={level.goal} disabled={disabled} onChange={(e) => setLevel(index, { goal: e.target.value as "win" | "survive" })}>
                                        <option value="win">Перемога</option>
                                        <option value="survive">Нічия теж</option>
                                    </Select>
                                </td>
                                <td style={{ width: 90 }}>
                                    <input type="number" min={1} value={level.par} disabled={disabled} onChange={(e) => setLevel(index, { par: Math.max(1, Number(e.target.value) || 1) })} />
                                </td>
                                <td>
                                    <input type="checkbox" checked={Boolean(level.boss)} disabled={disabled} onChange={() => setLevel(index, { boss: !level.boss })} />
                                </td>
                                <td>
                                    {!readOnly && (
                                        <LevelActions
                                            disabled={disabled}
                                            first={index === 0}
                                            last={index === draft.levels.length - 1}
                                            onUp={() => moveLevel(index, -1)}
                                            onDown={() => moveLevel(index, 1)}
                                            onDelete={() => setDraft((d) => ({ ...d, levels: d.levels.filter((_, i) => i !== index) }))}
                                        />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </LevelTable>
            </TableScroll>

            <SmallLabel as="div">
                Картки альбому (так їх бачить гравець, коли отримає)
                <AlbumPreview chapter={draft} />
            </SmallLabel>

            {error && <ErrorText style={{ margin: 0 }}>{error}</ErrorText>}

            {!readOnly && (
                <Row>
                    <GhostButton type="button" disabled={disabled} onClick={() => setDraft((d) => ({ ...d, levels: [...d.levels, { ...NEW_LEVEL, id: `${d.id}-${Date.now().toString(36)}` }] }))}>
                        + Додати рівень
                    </GhostButton>
                    <PillButton type="button" disabled={disabled || !dirty || !draft.name.trim()} style={{ marginTop: 0, width: "auto" }} onClick={() => void run("Не вдалося зберегти розділ.", () => saveCampaignChapter(draft))}>
                        {busy ? "Зберігаємо..." : dirty ? "Зберегти" : "Збережено"}
                    </PillButton>
                    {dirty && (
                        <GhostButton type="button" disabled={disabled} onClick={() => setDraft(chapter)}>
                            Скасувати зміни
                        </GhostButton>
                    )}
                    <DangerButton
                        type="button"
                        disabled={disabled}
                        style={{ marginLeft: "auto" }}
                        onClick={() => {
                            if (!window.confirm(`Видалити розділ "${chapter.name}" з усіма рівнями?`)) return;
                            void run("Не вдалося видалити розділ.", () => deleteCampaignChapter(chapter.id));
                        }}
                    >
                        Видалити розділ
                    </DangerButton>
                </Row>
            )}
        </ChapterCard>
    );
};

export const CampaignSection: React.FC = () => {
    const [chapters, setChapters] = useState<CampaignChapterDef[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [busy, setBusy] = useState(false);
    const [modSettings, setModSettings] = useState<ModifierSettings>(DEFAULT_MODIFIER_SETTINGS);

    const refresh = async () => {
        setError(null);
        try {
            setChapters(await getAllCampaignChapters());
        } catch (err) {
            setError(describeError("Не вдалося завантажити кампанію.", err));
            setChapters([]);
        }
    };

    useEffect(() => {
        void refresh();
        getModifierSettings()
            .then(setModSettings)
            .catch(() => undefined);
    }, []);

    // Вбудовані арти розділів + усі фони, вже завантажені для розділів у базі.
    const gallery = Array.from(new Set([...DEFAULT_CHAPTERS.map((c) => c.backgroundUrl), ...(chapters ?? []).map((c) => c.backgroundUrl)].filter(Boolean)));

    const importDefaults = async () => {
        setBusy(true);
        setError(null);
        try {
            for (const chapter of DEFAULT_CHAPTERS) await saveCampaignChapter(chapter);
            await refresh();
        } catch (err) {
            setError(describeError("Не вдалося додати стандартні розділи.", err));
        } finally {
            setBusy(false);
        }
    };

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const order = chapters?.length ? Math.max(...chapters.map((c) => c.order)) + 1 : 0;
            await saveCampaignChapter({
                id: createCampaignChapterId(),
                name: newName.trim(),
                subtitle: "",
                nameEn: "",
                subtitleEn: "",
                backgroundUrl: "",
                order,
                active: false,
                bossName: "",
                bossLine: "",
                bossNameEn: "",
                bossLineEn: "",
                rewardCoins: 100,
                rewardSkinId: "",
                levels: [{ ...NEW_LEVEL }],
            });
            setNewName("");
            await refresh();
        } catch (err) {
            setError(describeError("Не вдалося створити розділ.", err));
        } finally {
            setBusy(false);
        }
    };

    const empty = chapters !== null && chapters.length === 0;

    return (
        <>
            <Section>
                <SectionTitle>Новий розділ</SectionTitle>
                <form onSubmit={create}>
                    <AddThemeRow>
                        <TextInput placeholder="Назва розділу" value={newName} onChange={(e) => setNewName(e.target.value)} />
                        <PillButton type="submit" disabled={busy || !newName.trim()} style={{ marginTop: 0, width: "auto" }}>
                            {busy ? "Створюємо..." : "Додати"}
                        </PillButton>
                    </AddThemeRow>
                </form>
                <p style={{ margin: 0, fontSize: 13, color: "#8b653c" }}>
                    Новий розділ створюється неактивним - додайте фон і рівні, потім позначте «Активний».
                </p>
            </Section>

            <Section>
                <SectionTitle>Розділи кампанії{chapters ? ` (${chapters.length})` : ""}</SectionTitle>
                {error && <ErrorText>{error}</ErrorText>}
                {chapters === null ? (
                    <p>Завантаження...</p>
                ) : empty ? (
                    <>
                        <EmptyState>
                            У базі ще немає розділів - гра показує стандартну кампанію нижче (3 розділи по 6 рівнів, фони вже згенеровано). Додайте її в базу, щоб редагувати.
                        </EmptyState>
                        <PillButton type="button" disabled={busy} style={{ marginTop: 0, width: "auto", alignSelf: "flex-start" }} onClick={() => void importDefaults()}>
                            {busy ? "Додаємо..." : "Додати стандартні розділи в базу"}
                        </PillButton>
                        {DEFAULT_CHAPTERS.map((chapter) => (
                            <ChapterEditor key={chapter.id} chapter={chapter} onSaved={refresh} gallery={gallery} modSettings={modSettings} readOnly />
                        ))}
                    </>
                ) : (
                    chapters.map((chapter) => <ChapterEditor key={chapter.id} chapter={chapter} onSaved={refresh} gallery={gallery} modSettings={modSettings} />)
                )}
            </Section>
        </>
    );
};
