"use client";
import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { buttonTone, gameButtonCss } from "@game/components/GameButton";
import { ScoreBoard } from "@game/components/gameStyles";
import { DIFFICULTIES, setDifficulty, useDifficulty } from "@game/lib/difficulty";
import { trackEvent } from "@game/lib/firebase";
import { useT } from "@game/lib/i18n";
import { endDailyRun, useDailyRun } from "@game/lib/daily";
import { GameModeKey, MODIFIERS_BY_MODE, effectiveModifier, setModifier, useModifierChoice, weeklyModifier } from "@game/lib/modifiers";

// Компактна смуга над полем (як у прототипі): табло рахунку зі статусом і два випадні
// вибори - рівень ШІ й модифікатор - в один ряд замість двох рядів кнопок. Звільнене місце
// йде полю. Зміна рівня чи модифікатора починає нову партію (це робить сам режим гри).

const Bar = styled.div`
    position: relative;
    z-index: 20;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
    max-width: min(100%, 92vw, 640px);
    margin: 0 0 8px;

    & > ${ScoreBoard} {
        margin-bottom: 0;
    }
`;

const PickerWrap = styled.div`
    position: relative;
`;

const PickerButton = styled.button`
    ${gameButtonCss("sm")}
    gap: 6px;
    white-space: nowrap;
`;

const Pop = styled.div<{ $wide: boolean; $alignRight: boolean }>`
    position: absolute;
    top: calc(100% + 6px);
    ${({ $alignRight }) => ($alignRight ? "right: 0;" : "left: 50%; transform: translateX(-50%);")}
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: ${({ $wide }) => ($wide ? 250 : 150)}px;
    max-width: min(86vw, 320px);
    padding: 8px;
    border-radius: 16px;
    background: rgba(255, 247, 232, 0.97);
    box-shadow: 0 10px 24px rgba(70, 40, 10, 0.18);
`;

const Option = styled.button<{ $active: boolean }>`
    ${gameButtonCss("sm")}
    width: 100%;
    ${({ $active }) => ($active ? buttonTone("wood") : "")}
`;

const ModOption = styled.button<{ $active: boolean }>`
    ${gameButtonCss("md")}
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    text-align: left;
    ${({ $active }) => ($active ? buttonTone("wood") : "")}

    small {
        font-size: 11px;
        font-weight: 700;
        opacity: 0.85;
        line-height: 1.25;
    }
`;

const DailyBanner = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: min(92vw, 460px);
    padding: 6px 6px 6px 14px;
    border-radius: 999px;
    background: linear-gradient(155deg, #ffe3a3 0%, #f5c96a 100%);
    color: #4a2c0c;
    font-size: 14px;
    font-weight: 700;

    span {
        min-width: 0;
    }
`;

const LeaveButton = styled.button`
    ${gameButtonCss("sm")}
    ${buttonTone("wood")}
`;

const WeekTag = styled.span`
    margin-left: 5px;
    padding: 2px 5px;
    border-radius: 6px;
    background: #e8452f;
    color: #ffffff;
    font-size: 10px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-shadow: none;
`;

const ModifierHint = styled.p`
    max-width: min(92vw, 460px);
    margin: 0 0 8px;
    text-align: center;
    color: #4a2c0c;
    font-size: 13px;
    font-weight: 700;
    text-shadow: 0 1px 0 rgba(255, 250, 235, 0.8);
`;

const Caret = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
    </svg>
);

// Випадний вибір: кнопка з поточним значенням, по кліку - список; клік поза ним або Esc закриває.
const Dropdown: React.FC<{
    label: string;
    ariaLabel: string;
    wide?: boolean;
    alignRight?: boolean;
    children: (close: () => void) => React.ReactNode;
}> = ({ label, ariaLabel, wide = false, alignRight = false, children }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const onDown = (event: PointerEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);
    return (
        <PickerWrap ref={ref}>
            <PickerButton type="button" aria-haspopup="true" aria-expanded={open} aria-label={`${ariaLabel}: ${label}`} onClick={() => setOpen((v) => !v)}>
                {label}
                <Caret />
            </PickerButton>
            {open && (
                <Pop role="menu" $wide={wide} $alignRight={alignRight}>
                    {children(() => setOpen(false))}
                </Pop>
            )}
        </PickerWrap>
    );
};

// Поки йде виклик дня чи рівень кампанії, рівень ШІ й модифікатор задає сам виклик -
// замість виборів показуємо ціль і кнопку виходу.
export const DifficultyPicker = ({ mode, leading }: { mode: GameModeKey; leading?: React.ReactNode }) => {
    const t = useT();
    const difficulty = useDifficulty();
    const dailyRun = useDailyRun();
    const choice = useModifierChoice();
    const activeModifier = effectiveModifier(mode, choice);
    const weekly = weeklyModifier();

    if (dailyRun) {
        const dailyModifier = dailyRun.template.modifier;
        return (
            <>
                <Bar>
                    {leading}
                    <DailyBanner>
                        <span>
                            {dailyRun.kind === "campaign"
                                ? `${t("campaignLevel", { n: String((dailyRun.level ?? 0) + 1) })}: ${t(`level_${dailyRun.template.id}` as Parameters<typeof t>[0])}`
                                : `${t("dailyBadge", { n: String(dailyRun.day) })}: ${t(`daily_${dailyRun.template.id}` as Parameters<typeof t>[0])}`}
                        </span>
                        <LeaveButton type="button" onClick={endDailyRun}>
                            {t("dailyLeave")}
                        </LeaveButton>
                    </DailyBanner>
                </Bar>
                {dailyModifier && <ModifierHint>{t(`modifierDesc_${dailyModifier}`)}</ModifierHint>}
            </>
        );
    }

    const pickDifficulty = (level: (typeof DIFFICULTIES)[number]) => {
        if (level === difficulty) return;
        trackEvent("select_difficulty", { difficulty: level });
        setDifficulty(level);
    };
    const pickModifier = (value: typeof choice) => {
        if (value === activeModifier) return;
        trackEvent("select_modifier", { modifier: value ?? "none", mode });
        setModifier(value);
    };

    return (
        <Bar>
            {leading}
            <Dropdown label={t(`difficulty_${difficulty}`)} ariaLabel={t("difficultyLabel")}>
                {(close) =>
                    DIFFICULTIES.map((level) => (
                        <Option
                            key={level}
                            type="button"
                            role="menuitemradio"
                            aria-checked={difficulty === level}
                            $active={difficulty === level}
                            onClick={() => {
                                pickDifficulty(level);
                                close();
                            }}
                        >
                            {t(`difficulty_${level}`)}
                        </Option>
                    ))
                }
            </Dropdown>
            <Dropdown label={activeModifier ? t(`modifier_${activeModifier}`) : t("modifier_none")} ariaLabel={t("modifierLabel")} wide alignRight>
                {(close) => (
                    <>
                        <ModOption
                            type="button"
                            role="menuitemradio"
                            aria-checked={activeModifier === null}
                            $active={activeModifier === null}
                            onClick={() => {
                                pickModifier(null);
                                close();
                            }}
                        >
                            <span>{t("modifier_none")}</span>
                            <small>{t("modifierNoneDesc")}</small>
                        </ModOption>
                        {MODIFIERS_BY_MODE[mode].map((m) => (
                            <ModOption
                                key={m}
                                type="button"
                                role="menuitemradio"
                                aria-checked={activeModifier === m}
                                $active={activeModifier === m}
                                onClick={() => {
                                    pickModifier(m);
                                    close();
                                }}
                            >
                                <span>
                                    {t(`modifier_${m}`)}
                                    {m === weekly && <WeekTag>{t("weeklyTag")}</WeekTag>}
                                </span>
                                <small>{t(`modifierDesc_${m}`)}</small>
                            </ModOption>
                        ))}
                    </>
                )}
            </Dropdown>
        </Bar>
    );
};
