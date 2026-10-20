"use client";
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { deleteField, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@game/lib/firebase";
import {
    EN_STRINGS,
    LOCALES,
    LOCALE_NAMES,
    TRANSLATIONS_COLLECTION,
    UK_STRINGS,
    loadLocalePack,
    type Key,
    type Locale,
    type LocalePack,
    type TranslationOverrides,
} from "@game/lib/i18n";
import { getAllCampaignChapters, type CampaignChapterDef } from "@game/lib/campaignContent";
import { CAMPAIGN_THEMES, CLASSIC_THEME, getAllThemes, type Theme } from "@game/lib/themes";
import { SEO_EN, SEO_TRANSLATIONS, seoLabel } from "@/app/lib/seo/translations";
import { PillButton, ErrorText } from "@game/components/onlineStyles";
import { Section, SectionTitle, FilterBar, FilterButton, TableWrap, Table, Th, Td, EmptyState, CheckboxLabel } from "@/app/admin/adminStyles";

// Розділ адмінки "Переклади": тексти гри й SEO всіма мовами. Вбудовані переклади - у коді
// (game/src/lib/i18n.ts, locales/*.ts, app/lib/seo/translations.ts); правки звідси лягають
// поверх них у Firestore translations/{locale} і підхоплюються грою на наступному запуску.

type Tab = "buttons" | "texts" | "seo";
type Group = "strings" | "content" | "seo";

const TABS: { id: Tab; label: string }[] = [
    { id: "buttons", label: "Загальні кнопки" },
    { id: "texts", label: "Тексти" },
    { id: "seo", label: "SEO" },
];

type Row = { id: string; group: Group; key: string; label: string; uk: string; en: string; def: string };

// Кнопки й короткі підписи - короткий англійський текст без крапки в кінці й без речень.
const isButton = (key: Key): boolean => {
    const text = EN_STRINGS[key];
    return text.length <= 28 && !/[.!?…:]$/.test(text) && !/[.!?] /.test(text);
};

// Тексти з бази, які перекладаються тут: розділи, рівні, боси кампанії й назви скінів.
const contentRows = (chapters: CampaignChapterDef[], themes: Theme[], pack: LocalePack): Row[] => {
    const rows: Row[] = [];
    const add = (key: string, label: string, uk: string, en: string) =>
        rows.push({ id: `content|${key}`, group: "content", key, label, uk, en, def: pack.content[key] || en || uk });
    for (const chapter of chapters) {
        add(`chapter:${chapter.id}:name`, `Розділ «${chapter.name}» · назва`, chapter.name, chapter.nameEn ?? "");
        add(`chapter:${chapter.id}:subtitle`, `Розділ «${chapter.name}» · підзаголовок`, chapter.subtitle, chapter.subtitleEn ?? "");
        add(`chapter:${chapter.id}:bossName`, `Розділ «${chapter.name}» · бос`, chapter.bossName, chapter.bossNameEn ?? "");
        add(`chapter:${chapter.id}:bossLine`, `Розділ «${chapter.name}» · фраза боса`, chapter.bossLine, chapter.bossLineEn ?? "");
        chapter.levels.forEach((level, index) =>
            add(`level:${level.id}:title`, `Розділ «${chapter.name}» · рівень ${index + 1}`, level.title ?? "", level.titleEn ?? "")
        );
    }
    for (const theme of themes) add(`theme:${theme.id}:name`, `Скін «${theme.name}»`, theme.name, theme.nameEn ?? "");
    return rows;
};

const Toolbar = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;
`;

const Search = styled.input`
    flex: 1 1 240px;
    min-width: 0;
    padding: 9px 12px;
    border-radius: 10px;
    border: 2px solid rgba(139, 101, 60, 0.25);
    background: #fffaf0;
    color: #4a2c0c;
    font-size: 14px;
`;

const Cell = styled(Td)`
    white-space: normal;
    vertical-align: top;
    min-width: 200px;
    max-width: 320px;
    line-height: 1.35;
`;

const KeyCell = styled(Td)`
    white-space: normal;
    vertical-align: top;
    min-width: 150px;
    max-width: 220px;

    b {
        display: block;
        font-size: 13px;
    }

    code {
        font-size: 11px;
        color: #8a6a48;
        overflow-wrap: anywhere;
    }
`;

const Editor = styled.textarea<{ $state: "same" | "override" | "draft" }>`
    width: 100%;
    min-width: 260px;
    padding: 8px 10px;
    border-radius: 10px;
    border: 2px solid ${({ $state }) => ($state === "draft" ? "#0f6f8c" : $state === "override" ? "#c9974f" : "rgba(139, 101, 60, 0.2)")};
    background: #fffdf8;
    color: #4a2c0c;
    font: inherit;
    font-size: 13px;
    line-height: 1.35;
    resize: vertical;
`;

const ResetButton = styled.button`
    margin-top: 4px;
    padding: 2px 8px;
    border: 0;
    border-radius: 8px;
    background: rgba(139, 101, 60, 0.1);
    color: #7a5530;
    font-size: 12px;
    cursor: pointer;
`;

const Note = styled.p`
    margin: 0 0 12px;
    color: #7a5a35;
    font-size: 13px;
    line-height: 1.4;
`;

export const TranslationsSection: React.FC = () => {
    const [tab, setTab] = useState<Tab>("buttons");
    const [locale, setLocale] = useState<Locale>("fr");
    const [query, setQuery] = useState("");
    const [onlyChanged, setOnlyChanged] = useState(false);
    const [pack, setPack] = useState<LocalePack | null>(null);
    const [overrides, setOverrides] = useState<TranslationOverrides>({});
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [chapters, setChapters] = useState<CampaignChapterDef[]>([]);
    const [themes, setThemes] = useState<Theme[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);

    // Розділи й скіни з бази - один раз (їхні назви перекладаються у вкладці "Тексти").
    useEffect(() => {
        getAllCampaignChapters().then(setChapters).catch(() => setChapters([]));
        getAllThemes()
            .then((list) => setThemes([CLASSIC_THEME, ...list, ...CAMPAIGN_THEMES.filter((theme) => !list.some((item) => item.id === theme.id))]))
            .catch(() => setThemes([CLASSIC_THEME, ...CAMPAIGN_THEMES]));
    }, []);

    // Вбудований переклад обраної мови й правки до нього з Firestore.
    useEffect(() => {
        let cancelled = false;
        setPack(null);
        setDrafts({});
        setNote(null);
        setError(null);
        Promise.all([loadLocalePack(locale), getDoc(doc(getFirebaseDb(), TRANSLATIONS_COLLECTION, locale))])
            .then(([loaded, snap]) => {
                if (cancelled) return;
                setPack(loaded);
                setOverrides(snap.exists() ? (snap.data() as TranslationOverrides) : {});
            })
            .catch(() => !cancelled && setError("Не вдалося завантажити переклади."));
        return () => {
            cancelled = true;
        };
    }, [locale]);

    const rows = useMemo<Row[]>(() => {
        if (!pack) return [];
        if (tab === "seo") {
            return Object.keys(SEO_EN).map((key) => ({
                id: `seo|${key}`,
                group: "seo",
                key,
                label: seoLabel(key),
                uk: SEO_TRANSLATIONS.uk[key] ?? "",
                en: SEO_EN[key],
                def: locale === "en" ? SEO_EN[key] : SEO_TRANSLATIONS[locale][key] ?? SEO_EN[key],
            }));
        }
        const keys = (Object.keys(UK_STRINGS) as Key[]).filter((key) => (tab === "buttons" ? isButton(key) : !isButton(key)));
        const strings: Row[] = keys.map((key) => ({ id: `strings|${key}`, group: "strings", key, label: key, uk: UK_STRINGS[key], en: EN_STRINGS[key], def: pack.strings[key] }));
        // Назви з бази українською й англійською редагуються в "Кампанії" й "Темах" - тут лише інші мови.
        return tab === "texts" && locale !== "uk" && locale !== "en" ? [...strings, ...contentRows(chapters, themes, pack)] : strings;
    }, [pack, tab, locale, chapters, themes]);

    const saved = (row: Row): string | undefined => (overrides[row.group] as Record<string, string> | undefined)?.[row.key];
    const valueOf = (row: Row): string => drafts[row.id] ?? saved(row) ?? row.def;
    const changedIds = Object.keys(drafts).filter((id) => {
        const row = rows.find((item) => item.id === id);
        return row && drafts[id] !== (saved(row) ?? row.def);
    });

    const needle = query.trim().toLowerCase();
    const shown = rows.filter((row) => {
        if (onlyChanged && saved(row) === undefined && !changedIds.includes(row.id)) return false;
        if (!needle) return true;
        return [row.key, row.label, row.uk, row.en, valueOf(row)].some((text) => text.toLowerCase().includes(needle));
    });

    const save = async () => {
        setSaving(true);
        setError(null);
        setNote(null);
        try {
            const patch: Record<Group, Record<string, unknown>> = { strings: {}, content: {}, seo: {} };
            for (const id of changedIds) {
                const row = rows.find((item) => item.id === id);
                if (!row) continue;
                const value = drafts[id].trim();
                // Збіг із вбудованим перекладом (або порожньо) - правку прибираємо.
                patch[row.group][row.key] = !value || value === row.def ? deleteField() : value;
            }
            const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
            (Object.keys(patch) as Group[]).forEach((group) => {
                if (Object.keys(patch[group]).length) data[group] = patch[group];
            });
            await setDoc(doc(getFirebaseDb(), TRANSLATIONS_COLLECTION, locale), data, { merge: true });
            const snap = await getDoc(doc(getFirebaseDb(), TRANSLATIONS_COLLECTION, locale));
            setOverrides(snap.exists() ? (snap.data() as TranslationOverrides) : {});
            setDrafts({});
            setNote(`Збережено змін: ${changedIds.length}. Гравці побачать їх при наступному запуску гри.`);
        } catch {
            setError("Не вдалося зберегти. Перевірте права адміна й з'єднання.");
        } finally {
            setSaving(false);
        }
    };

    const reference = (["uk", "en"] as Locale[]).filter((item) => item !== locale);

    return (
        <Section>
            <FilterBar role="tablist" aria-label="Вкладки перекладів" style={{ marginBottom: 12 }}>
                {TABS.map((item) => (
                    <FilterButton key={item.id} type="button" role="tab" aria-selected={tab === item.id} $active={tab === item.id} onClick={() => setTab(item.id)}>
                        {item.label}
                    </FilterButton>
                ))}
            </FilterBar>

            <SectionTitle>Мова</SectionTitle>
            <FilterBar role="group" aria-label="Мова перекладу">
                {LOCALES.map((item) => (
                    <FilterButton key={item} type="button" lang={item} aria-pressed={locale === item} $active={locale === item} onClick={() => setLocale(item)}>
                        {LOCALE_NAMES[item]}
                    </FilterButton>
                ))}
            </FilterBar>

            {tab === "seo" && (
                <Note>Title й description сторінок сайту. Сайт поки має лише англійські адреси, тож інші мови тут - переклад на майбутні мовні версії сторінок.</Note>
            )}
            {tab === "texts" && (locale === "uk" || locale === "en") && (
                <Note>Назви розділів, рівнів, босів і скінів українською й англійською редагуються в розділах «Кампанія» й «Теми»; тут - решта текстів гри.</Note>
            )}

            <Toolbar>
                <Search type="search" placeholder="Пошук за ключем або текстом" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Пошук" />
                <CheckboxLabel>
                    <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />
                    Лише змінені
                </CheckboxLabel>
                <PillButton type="button" disabled={saving || changedIds.length === 0} onClick={() => void save()}>
                    {saving ? "Зберігаємо..." : `Зберегти${changedIds.length ? ` (${changedIds.length})` : ""}`}
                </PillButton>
            </Toolbar>
            {error && <ErrorText>{error}</ErrorText>}
            {note && <Note>{note}</Note>}

            {!pack ? (
                <EmptyState>Завантаження...</EmptyState>
            ) : shown.length === 0 ? (
                <EmptyState>Нічого не знайдено.</EmptyState>
            ) : (
                <TableWrap>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Ключ ({shown.length})</Th>
                                {reference.map((item) => (
                                    <Th key={item}>{LOCALE_NAMES[item]}</Th>
                                ))}
                                <Th>{LOCALE_NAMES[locale]}</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {shown.map((row) => {
                                const value = valueOf(row);
                                const state = changedIds.includes(row.id) ? "draft" : saved(row) !== undefined ? "override" : "same";
                                return (
                                    <tr key={row.id}>
                                        <KeyCell>
                                            <b>{row.label}</b>
                                            {row.label !== row.key && <code>{row.key}</code>}
                                        </KeyCell>
                                        {reference.map((item) => (
                                            <Cell key={item} lang={item}>
                                                {item === "uk" ? row.uk : row.en}
                                            </Cell>
                                        ))}
                                        <Cell lang={locale}>
                                            <Editor
                                                $state={state}
                                                rows={Math.min(6, Math.max(1, Math.ceil(value.length / 42)))}
                                                value={value}
                                                aria-label={`${row.label} · ${LOCALE_NAMES[locale]}`}
                                                onChange={(e) => setDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                                            />
                                            {(state !== "same" || value !== row.def) && (
                                                <ResetButton type="button" onClick={() => setDrafts((prev) => ({ ...prev, [row.id]: row.def }))} title={row.def}>
                                                    ↺ Вбудований переклад
                                                </ResetButton>
                                            )}
                                        </Cell>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </TableWrap>
            )}
        </Section>
    );
};
