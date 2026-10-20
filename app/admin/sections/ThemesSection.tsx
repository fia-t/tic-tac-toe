"use client";
import React, { useEffect, useState } from "react";
import {
    Theme,
    ThemeImageKind,
    getAllThemes,
    createTheme,
    updateTheme,
    deleteTheme,
    uploadThemeImage,
    DEFAULT_SKIN_PRICE,
    eventStatus,
    shortDate,
    type EventStatus,
} from "@game/lib/themes";
import { deleteField } from "firebase/firestore";
import styled from "styled-components";
import { PillButton, TextInput, ErrorText } from "@game/components/onlineStyles";
import {
    Section,
    SectionTitle,
    ThemeGrid,
    ThemeCard,
    ThumbRow,
    Thumb,
    ThemeName,
    ThemeActionsRow,
    SmallLabel,
    FileInput,
    CheckboxLabel,
    DangerButton,
    GhostButton,
    AddThemeRow,
} from "@/app/admin/adminStyles";

// Посилання на гру з цим скіном для iframe у новині (app/embed): лише партія з ботом, без меню.
const embedUrl = (themeId: string): string => `${window.location.origin}/embed?skin=${encodeURIComponent(themeId)}`;

const EmbedRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;

    input {
        flex: 1;
        min-width: 0;
        padding: 6px 8px;
        border-radius: 8px;
        border: 1px solid rgba(139, 101, 60, 0.25);
        background: #fffdf8;
        color: #5b3f22;
        font-size: 12px;
    }
`;

const fieldForKind = (kind: ThemeImageKind): "backgroundUrl" | "xMarkerUrl" | "oMarkerUrl" =>
    kind === "background" ? "backgroundUrl" : kind === "x" ? "xMarkerUrl" : "oMarkerUrl";

const kindLabel: Record<ThemeImageKind, string> = {
    background: "Фон",
    x: "Скін X",
    o: "Скін O",
};

// Firebase-помилки (permission-denied, unauthenticated, тощо) мають код -
// показуємо його поруч із текстом, інакше "Не вдалося..." нічого не каже
// про справжню причину (протерміноване правило, ще не оновлений token і т.п.).
const describeError = (fallback: string, err: unknown): string => {
    const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : null;
    console.error(fallback, err);
    return code ? `${fallback} (${code})` : fallback;
};

// Івентова тема: у магазині першою, купується лише в дати івенту; до старту - "Скоро",
// після кінця зникає з магазину (у кого вже є - лишається).
const EventBox = styled.div<{ $on: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    border-radius: 12px;
    background: ${({ $on }) => ($on ? "rgba(232, 69, 47, 0.08)" : "transparent")};
    border: 1px dashed ${({ $on }) => ($on ? "rgba(232, 69, 47, 0.45)" : "rgba(139, 101, 60, 0.25)")};
`;

const DateRow = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
`;

const EventChip = styled.span<{ $status: EventStatus }>`
    margin-left: auto;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    background: ${({ $status }) => ($status === "live" ? "#dcefd9" : $status === "soon" ? "rgba(245, 184, 46, 0.25)" : "rgba(139, 101, 60, 0.12)")};
    color: ${({ $status }) => ($status === "live" ? "#2f8a3e" : $status === "soon" ? "#8a5a0a" : "#8b653c")};
`;

const EVENT_LABEL: Record<EventStatus, (theme: Theme) => string> = {
    none: () => "",
    soon: (theme) => `Скоро · з ${shortDate(theme.eventStart ?? "")}`,
    live: (theme) => (theme.eventEnd ? `Іде · до ${shortDate(theme.eventEnd)}` : "Іде"),
    ended: (theme) => `Завершено ${shortDate(theme.eventEnd ?? "")}`,
};

// Управління каталогом тем (фон + скіни X/O) - без змін у логіці, лише
// винесено з app/admin/page.tsx у власний розділ адмінського меню "Теми".
export const ThemesSection: React.FC = () => {
    const [themes, setThemes] = useState<Theme[]>([]);
    const [themesLoading, setThemesLoading] = useState(false);
    const [themesError, setThemesError] = useState<string | null>(null);
    const [busyThemeId, setBusyThemeId] = useState<string | null>(null);
    const [copiedThemeId, setCopiedThemeId] = useState<string | null>(null);

    const copyEmbedLink = async (themeId: string, input: HTMLInputElement | null) => {
        try {
            await navigator.clipboard.writeText(embedUrl(themeId));
            setCopiedThemeId(themeId);
            setTimeout(() => setCopiedThemeId((id) => (id === themeId ? null : id)), 2000);
        } catch {
            // Буфер обміну недоступний - виділяємо посилання, щоб скопіювати вручну.
            input?.select();
        }
    };
    const [newThemeName, setNewThemeName] = useState("");
    const [creating, setCreating] = useState(false);

    const refreshThemes = async () => {
        setThemesLoading(true);
        setThemesError(null);
        try {
            setThemes(await getAllThemes());
        } catch (err) {
            setThemesError(describeError("Не вдалося завантажити список тем.", err));
        } finally {
            setThemesLoading(false);
        }
    };

    useEffect(() => {
        void refreshThemes();
    }, []);

    const handleCreateTheme = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newThemeName.trim()) return;
        setCreating(true);
        try {
            await createTheme(newThemeName.trim());
            setNewThemeName("");
            await refreshThemes();
        } catch (err) {
            setThemesError(describeError("Не вдалося створити тему.", err));
        } finally {
            setCreating(false);
        }
    };

    const handleImageUpload = async (theme: Theme, kind: ThemeImageKind, file: File) => {
        setBusyThemeId(theme.id);
        setThemesError(null);
        try {
            const url = await uploadThemeImage(theme.id, file, kind);
            await updateTheme(theme.id, { [fieldForKind(kind)]: url });
            await refreshThemes();
        } catch (err) {
            setThemesError(describeError("Не вдалося завантажити зображення.", err));
        } finally {
            setBusyThemeId(null);
        }
    };

    const handleToggleActive = async (theme: Theme) => {
        setBusyThemeId(theme.id);
        try {
            await updateTheme(theme.id, { active: !theme.active });
            await refreshThemes();
        } catch (err) {
            setThemesError(describeError("Не вдалося оновити тему.", err));
        } finally {
            setBusyThemeId(null);
        }
    };

    const handlePriceSave = async (theme: Theme, raw: string) => {
        const value = raw.trim() === "" ? null : Math.max(0, Math.floor(Number(raw)));
        if (value !== null && Number.isNaN(value)) return;
        if ((theme.price ?? null) === value) return;
        setBusyThemeId(theme.id);
        try {
            // Порожнє поле - ціна за замовчуванням (DEFAULT_SKIN_PRICE у грі).
            await updateTheme(theme.id, { price: value ?? deleteField() } as Partial<Theme>);
            await refreshThemes();
        } catch (err) {
            setThemesError(describeError("Не вдалося зберегти ціну.", err));
        } finally {
            setBusyThemeId(null);
        }
    };

    // Івент: позначка й дати "YYYY-MM-DD" (порожня дата - поле прибирається з документа).
    const handleEventSave = async (theme: Theme, patch: { event?: boolean; eventStart?: string; eventEnd?: string }) => {
        const next = { event: theme.event ?? false, eventStart: theme.eventStart ?? "", eventEnd: theme.eventEnd ?? "", ...patch };
        if (next.eventStart && next.eventEnd && next.eventStart > next.eventEnd) {
            setThemesError("Дата початку івенту пізніша за дату кінця.");
            return;
        }
        setBusyThemeId(theme.id);
        setThemesError(null);
        try {
            await updateTheme(theme.id, {
                event: next.event,
                eventStart: next.eventStart || deleteField(),
                eventEnd: next.eventEnd || deleteField(),
            } as Partial<Theme>);
            await refreshThemes();
        } catch (err) {
            setThemesError(describeError("Не вдалося зберегти івент.", err));
        } finally {
            setBusyThemeId(null);
        }
    };

    // Назва (укр.) і назва англійською - зберігаються при виході з поля.
    const handleNameSave = async (theme: Theme, field: "name" | "nameEn", raw: string) => {
        const value = raw.trim();
        if (value === (theme[field] ?? "")) return;
        if (field === "name" && !value) return;
        setBusyThemeId(theme.id);
        try {
            await updateTheme(theme.id, { [field]: value || deleteField() } as Partial<Theme>);
            await refreshThemes();
        } catch (err) {
            setThemesError(describeError("Не вдалося зберегти назву.", err));
        } finally {
            setBusyThemeId(null);
        }
    };

    const handleDelete = async (theme: Theme) => {
        if (!window.confirm(`Видалити тему "${theme.name}"?`)) return;
        setBusyThemeId(theme.id);
        try {
            await deleteTheme(theme.id);
            await refreshThemes();
        } catch (err) {
            setThemesError(describeError("Не вдалося видалити тему.", err));
        } finally {
            setBusyThemeId(null);
        }
    };

    return (
        <>
            <Section>
                <SectionTitle>Нова тема</SectionTitle>
                <form onSubmit={handleCreateTheme}>
                    <AddThemeRow>
                        <TextInput
                            placeholder="Назва теми"
                            value={newThemeName}
                            onChange={(e) => setNewThemeName(e.target.value)}
                        />
                        <PillButton type="submit" disabled={creating || !newThemeName.trim()} style={{ marginTop: 0, width: "auto" }}>
                            {creating ? "Створюємо..." : "Додати"}
                        </PillButton>
                    </AddThemeRow>
                </form>
            </Section>

            <Section>
                <SectionTitle>Каталог ({themes.length})</SectionTitle>
                {themesError && <ErrorText>{themesError}</ErrorText>}
                {themesLoading ? (
                    <p>Завантаження...</p>
                ) : themes.length === 0 ? (
                    <p>Тем ще немає - додайте першу вище.</p>
                ) : (
                    <ThemeGrid>
                        {themes.map((theme) => {
                            const busy = busyThemeId === theme.id;
                            const complete = Boolean(theme.backgroundUrl && theme.xMarkerUrl && theme.oMarkerUrl);
                            return (
                                <ThemeCard key={theme.id} $active={theme.active}>
                                    <ThemeName>{theme.name}</ThemeName>
                                    <DateRow>
                                        <SmallLabel>
                                            Назва
                                            <TextInput
                                                key={`${theme.id}-name-${theme.name}`}
                                                defaultValue={theme.name}
                                                disabled={busy}
                                                onBlur={(e) => void handleNameSave(theme, "name", e.target.value)}
                                            />
                                        </SmallLabel>
                                        <SmallLabel>
                                            Назва англійською
                                            <TextInput
                                                key={`${theme.id}-nameEn-${theme.nameEn ?? ""}`}
                                                defaultValue={theme.nameEn ?? ""}
                                                placeholder="English name"
                                                disabled={busy}
                                                onBlur={(e) => void handleNameSave(theme, "nameEn", e.target.value)}
                                            />
                                        </SmallLabel>
                                    </DateRow>
                                    <ThumbRow>
                                        <Thumb $src={theme.backgroundUrl} title="Фон" />
                                        <Thumb $src={theme.xMarkerUrl} title="X" />
                                        <Thumb $src={theme.oMarkerUrl} title="O" />
                                    </ThumbRow>

                                    {(["background", "x", "o"] as ThemeImageKind[]).map((kind) => (
                                        <SmallLabel key={kind}>
                                            {kindLabel[kind]}
                                            <FileInput
                                                type="file"
                                                accept="image/*"
                                                disabled={busy}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) void handleImageUpload(theme, kind, file);
                                                    e.target.value = "";
                                                }}
                                            />
                                        </SmallLabel>
                                    ))}

                                    <SmallLabel>
                                        Ціна в магазині (монети; 0 - безкоштовно, порожньо - {DEFAULT_SKIN_PRICE})
                                        <TextInput
                                            key={`${theme.id}-${theme.price ?? ""}`}
                                            type="number"
                                            min={0}
                                            step={10}
                                            inputMode="numeric"
                                            defaultValue={theme.price ?? ""}
                                            placeholder={String(DEFAULT_SKIN_PRICE)}
                                            disabled={busy}
                                            onBlur={(e) => void handlePriceSave(theme, e.target.value)}
                                        />
                                    </SmallLabel>

                                    <EventBox $on={Boolean(theme.event)}>
                                        <CheckboxLabel>
                                            <input type="checkbox" checked={Boolean(theme.event)} disabled={busy} onChange={() => void handleEventSave(theme, { event: !theme.event })} />
                                            Івентова тема
                                            {theme.event && <EventChip $status={eventStatus(theme)}>{EVENT_LABEL[eventStatus(theme)](theme)}</EventChip>}
                                        </CheckboxLabel>
                                        {theme.event && (
                                            <DateRow>
                                                <SmallLabel>
                                                    З
                                                    <TextInput
                                                        type="date"
                                                        value={theme.eventStart ?? ""}
                                                        max={theme.eventEnd || undefined}
                                                        disabled={busy}
                                                        onChange={(e) => void handleEventSave(theme, { eventStart: e.target.value })}
                                                    />
                                                </SmallLabel>
                                                <SmallLabel>
                                                    По (включно)
                                                    <TextInput
                                                        type="date"
                                                        value={theme.eventEnd ?? ""}
                                                        min={theme.eventStart || undefined}
                                                        disabled={busy}
                                                        onChange={(e) => void handleEventSave(theme, { eventEnd: e.target.value })}
                                                    />
                                                </SmallLabel>
                                            </DateRow>
                                        )}
                                    </EventBox>

                                    {!complete && <ErrorText style={{ margin: 0 }}>Додайте всі 3 зображення, щоб тема стала доступною в грі.</ErrorText>}

                                    <ThemeActionsRow>
                                        <CheckboxLabel>
                                            <input
                                                type="checkbox"
                                                checked={theme.active}
                                                disabled={busy || !complete}
                                                onChange={() => void handleToggleActive(theme)}
                                            />
                                            Активна
                                        </CheckboxLabel>
                                        <DangerButton type="button" disabled={busy} onClick={() => void handleDelete(theme)}>
                                            Видалити
                                        </DangerButton>
                                    </ThemeActionsRow>

                                    {theme.active && (
                                        <SmallLabel as="div" title="Гра лише з цим скіном для iframe на сторінці новини (поле Game iframe link)">
                                            Посилання для новин
                                            <EmbedRow>
                                                <input id={`embed-${theme.id}`} readOnly value={embedUrl(theme.id)} onFocus={(e) => e.currentTarget.select()} aria-label={`Посилання для новин: ${theme.name}`} />
                                                <GhostButton
                                                    type="button"
                                                    onClick={() => void copyEmbedLink(theme.id, document.getElementById(`embed-${theme.id}`) as HTMLInputElement | null)}
                                                >
                                                    {copiedThemeId === theme.id ? "Скопійовано" : "Копіювати"}
                                                </GhostButton>
                                            </EmbedRow>
                                        </SmallLabel>
                                    )}
                                </ThemeCard>
                            );
                        })}
                    </ThemeGrid>
                )}
            </Section>
        </>
    );
};
