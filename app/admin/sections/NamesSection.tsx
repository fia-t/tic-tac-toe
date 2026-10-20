"use client";
import React, { useEffect, useState } from "react";
import {
    NameEntry,
    getAllNames,
    createName,
    updateName,
    deleteName,
    seedDefaultNames,
} from "@game/lib/names";
import { PillButton, TextInput, ErrorText } from "@game/components/onlineStyles";
import { LOCALES, LOCALE_NAMES, type Locale } from "@game/lib/i18n";
import styled from "styled-components";
import {
    Section,
    SectionTitle,
    AddThemeRow,
    NameList,
    NameRow,
    NameLabel,
    InlineActions,
    CheckboxLabel,
    DangerButton,
    GhostButton,
} from "@/app/admin/adminStyles";

const describeError = (fallback: string, err: unknown): string => {
    const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : null;
    console.error(fallback, err);
    return code ? `${fallback} (${code})` : fallback;
};

const MAX_NAMES = 20;

// Мови перекладу імені (українською - саме ім'я).
const NAME_LOCALES = LOCALES.filter((locale) => locale !== "uk");

const TranslationsGrid = styled.div`
    flex-basis: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
    padding-top: 6px;

    label {
        display: flex;
        flex-direction: column;
        gap: 3px;
        font-size: 12px;
        font-weight: 700;
        color: #7a5a35;
    }

    input {
        padding: 6px 8px;
        border-radius: 8px;
        border: 1px solid rgba(139, 101, 60, 0.25);
        background: #fffdf8;
        color: #4a2c0c;
        font-size: 14px;
    }
`;

// Керування пулом "цікавих" імен для табло рахунку (vs AI та гра з другом).
// Порожня колекція автоматично засівається стартовим набором із 20 імен
// при першому відкритті цього розділу.
export const NamesSection: React.FC = () => {
    const [names, setNames] = useState<NameEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState("");
    // Відкриті переклади одного імені й чернетка до збереження.
    const [translatingId, setTranslatingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<Partial<Record<Locale, string>>>({});

    const toggleTranslations = (entry: NameEntry) => {
        if (translatingId === entry.id) {
            setTranslatingId(null);
            return;
        }
        setTranslatingId(entry.id);
        setDraft(entry.translations);
    };

    const saveTranslations = async (entry: NameEntry) => {
        setBusyId(entry.id);
        try {
            const translations = Object.fromEntries(
                Object.entries(draft)
                    .map(([locale, value]) => [locale, (value ?? "").trim()])
                    .filter(([, value]) => value)
            ) as Partial<Record<Locale, string>>;
            await updateName(entry.id, { translations });
            setTranslatingId(null);
            await refresh();
        } catch (err) {
            setError(describeError("Не вдалося зберегти переклади.", err));
        } finally {
            setBusyId(null);
        }
    };

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            setNames(await getAllNames());
        } catch (err) {
            setError(describeError("Не вдалося завантажити список імен.", err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const existing = await getAllNames();
                if (existing.length === 0) {
                    await seedDefaultNames();
                    setNames(await getAllNames());
                } else {
                    setNames(existing);
                }
            } catch (err) {
                setError(describeError("Не вдалося завантажити список імен.", err));
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || names.length >= MAX_NAMES) return;
        setCreating(true);
        try {
            await createName(newName.trim());
            setNewName("");
            await refresh();
        } catch (err) {
            setError(describeError("Не вдалося додати ім'я.", err));
        } finally {
            setCreating(false);
        }
    };

    const handleToggleActive = async (entry: NameEntry) => {
        setBusyId(entry.id);
        try {
            await updateName(entry.id, { active: !entry.active });
            await refresh();
        } catch (err) {
            setError(describeError("Не вдалося оновити ім'я.", err));
        } finally {
            setBusyId(null);
        }
    };

    const startEditing = (entry: NameEntry) => {
        setEditingId(entry.id);
        setEditingValue(entry.name);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditingValue("");
    };

    const saveEditing = async (entry: NameEntry) => {
        if (!editingValue.trim()) return;
        setBusyId(entry.id);
        try {
            await updateName(entry.id, { name: editingValue.trim() });
            cancelEditing();
            await refresh();
        } catch (err) {
            setError(describeError("Не вдалося зберегти ім'я.", err));
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (entry: NameEntry) => {
        if (!window.confirm(`Видалити ім'я "${entry.name}"?`)) return;
        setBusyId(entry.id);
        try {
            await deleteName(entry.id);
            await refresh();
        } catch (err) {
            setError(describeError("Не вдалося видалити ім'я.", err));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <>
            <Section>
                <SectionTitle>Нове ім&apos;я ({names.length}/{MAX_NAMES})</SectionTitle>
                <form onSubmit={handleCreate}>
                    <AddThemeRow>
                        <TextInput
                            placeholder='Напр. "Рожевий Бегемот"'
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            disabled={names.length >= MAX_NAMES}
                        />
                        <PillButton
                            type="submit"
                            disabled={creating || !newName.trim() || names.length >= MAX_NAMES}
                            style={{ marginTop: 0, width: "auto" }}
                        >
                            {creating ? "Додаємо..." : "Додати"}
                        </PillButton>
                    </AddThemeRow>
                </form>
                {names.length >= MAX_NAMES && (
                    <ErrorText>Досягнуто ліміт у {MAX_NAMES} імен - видаліть якесь, щоб додати нове.</ErrorText>
                )}
            </Section>

            <Section>
                <SectionTitle>Список імен ({names.length})</SectionTitle>
                {error && <ErrorText>{error}</ErrorText>}
                {loading ? (
                    <p>Завантаження...</p>
                ) : names.length === 0 ? (
                    <p>Імен ще немає.</p>
                ) : (
                    <NameList>
                        {names.map((entry) => {
                            const busy = busyId === entry.id;
                            const isEditing = editingId === entry.id;
                            return (
                                <NameRow key={entry.id}>
                                    {isEditing ? (
                                        <TextInput
                                            value={editingValue}
                                            onChange={(e) => setEditingValue(e.target.value)}
                                            style={{ flex: 1, minWidth: 140 }}
                                            autoFocus
                                        />
                                    ) : (
                                        <NameLabel>{entry.name}</NameLabel>
                                    )}

                                    <InlineActions>
                                        <CheckboxLabel>
                                            <input
                                                type="checkbox"
                                                checked={entry.active}
                                                disabled={busy || isEditing}
                                                onChange={() => void handleToggleActive(entry)}
                                            />
                                            Активне
                                        </CheckboxLabel>

                                        {isEditing ? (
                                            <>
                                                <GhostButton type="button" disabled={busy} onClick={() => void saveEditing(entry)}>
                                                    Зберегти
                                                </GhostButton>
                                                <GhostButton type="button" disabled={busy} onClick={cancelEditing}>
                                                    Скасувати
                                                </GhostButton>
                                            </>
                                        ) : (
                                            <GhostButton type="button" disabled={busy} onClick={() => startEditing(entry)}>
                                                Редагувати
                                            </GhostButton>
                                        )}

                                        <GhostButton type="button" disabled={busy} aria-expanded={translatingId === entry.id} onClick={() => toggleTranslations(entry)}>
                                            Переклади ({NAME_LOCALES.filter((locale) => entry.translations[locale]).length}/{NAME_LOCALES.length})
                                        </GhostButton>

                                        <DangerButton type="button" disabled={busy} onClick={() => void handleDelete(entry)}>
                                            Видалити
                                        </DangerButton>
                                    </InlineActions>

                                    {translatingId === entry.id && (
                                        <TranslationsGrid>
                                            {NAME_LOCALES.map((locale) => (
                                                <label key={locale}>
                                                    {LOCALE_NAMES[locale]}
                                                    <input
                                                        lang={locale}
                                                        value={draft[locale] ?? ""}
                                                        placeholder={entry.translations.en ?? entry.name}
                                                        onChange={(e) => setDraft((prev) => ({ ...prev, [locale]: e.target.value }))}
                                                    />
                                                </label>
                                            ))}
                                            <InlineActions style={{ alignSelf: "end" }}>
                                                <GhostButton type="button" disabled={busy} onClick={() => void saveTranslations(entry)}>
                                                    Зберегти переклади
                                                </GhostButton>
                                            </InlineActions>
                                        </TranslationsGrid>
                                    )}
                                </NameRow>
                            );
                        })}
                    </NameList>
                )}
            </Section>
        </>
    );
};
