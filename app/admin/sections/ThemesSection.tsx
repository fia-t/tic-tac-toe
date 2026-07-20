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
} from "@/app/lib/themes";
import { PillButton, TextInput, ErrorText } from "@/app/components/onlineStyles";
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
    AddThemeRow,
} from "@/app/admin/adminStyles";

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

// Управління каталогом тем (фон + скіни X/O) - без змін у логіці, лише
// винесено з app/admin/page.tsx у власний розділ адмінського меню "Теми".
export const ThemesSection: React.FC = () => {
    const [themes, setThemes] = useState<Theme[]>([]);
    const [themesLoading, setThemesLoading] = useState(false);
    const [themesError, setThemesError] = useState<string | null>(null);
    const [busyThemeId, setBusyThemeId] = useState<string | null>(null);
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
                                </ThemeCard>
                            );
                        })}
                    </ThemeGrid>
                )}
            </Section>
        </>
    );
};
