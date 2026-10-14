"use client";
import styled from "styled-components";
import { buttonTone, gameButtonCss } from "@game/components/GameButton";
import { DIFFICULTIES, setDifficulty, useDifficulty } from "@game/lib/difficulty";
import { trackEvent } from "@game/lib/firebase";
import { useT } from "@game/lib/i18n";
import { endDailyRun, useDailyRun } from "@game/lib/daily";
import { GameModeKey, MODIFIERS_BY_MODE, effectiveModifier, setModifier, useModifierChoice, weeklyModifier } from "@game/lib/modifiers";

// Перемикач рівня ШІ над полем - у тому ж пісочному стилі, що й табло рахунку.
// Зміна рівня починає нову партію (це робить TicTacToe, підписаний на useDifficulty).
const Group = styled.div`
    display: inline-flex;
    gap: 6px;
    margin: 0 0 8px;
`;

const Option = styled.button<{ $active: boolean }>`
    ${gameButtonCss("sm")}
    ${({ $active }) => ($active ? buttonTone("wood") : "")}
`;

const DailyBanner = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: min(92vw, 460px);
    margin: 0 0 8px;
    padding: 6px 6px 6px 14px;
    border-radius: 999px;
    background: linear-gradient(155deg, #ffe3a3 0%, #f5c96a 100%);
    box-shadow: 3px 3px 6px rgba(101, 72, 35, 0.25);
    color: #4a2c0c;
    font-size: 14px;
    font-weight: 700;

    span {
        min-width: 0;
    }
`;

const Chips = styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    max-width: min(100%, 92vw, 600px);
    margin: 0 0 6px;

    /* Вузький iframe/телефон: один рядок з прокруткою вбік - щоб не з'їдати висоту поля. */
    @media (max-width: 640px) {
        flex-wrap: nowrap;
        justify-content: flex-start;
        overflow-x: auto;
        padding: 2px 2px 4px;
        scrollbar-width: none;
    }
`;

const Chip = styled.button<{ $active: boolean }>`
    ${gameButtonCss("xs")}
    flex-shrink: 0;
    white-space: nowrap;
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

// Вибір модифікатора - лише ті, що мають сенс у поточному режимі. Зміна починає нову партію.
const ModifierPicker = ({ mode }: { mode: GameModeKey }) => {
    const t = useT();
    const choice = useModifierChoice();
    const active = effectiveModifier(mode, choice);
    const weekly = weeklyModifier();
    const pick = (value: typeof choice) => {
        if (value === active) return;
        trackEvent("select_modifier", { modifier: value ?? "none", mode });
        setModifier(value);
    };
    return (
        <>
            <Chips role="group" aria-label={t("modifierLabel")}>
                <Chip type="button" $active={active === null} aria-pressed={active === null} onClick={() => pick(null)}>
                    {t("modifier_none")}
                </Chip>
                {MODIFIERS_BY_MODE[mode].map((m) => (
                    <Chip key={m} type="button" $active={active === m} aria-pressed={active === m} onClick={() => pick(m)}>
                        {t(`modifier_${m}`)}
                        {m === weekly && <WeekTag>{t("weeklyTag")}</WeekTag>}
                    </Chip>
                ))}
            </Chips>
            {active && <ModifierHint>{t(`modifierDesc_${active}`)}</ModifierHint>}
        </>
    );
};

// Поки йде виклик дня, рівень ШІ й модифікатор задає сам виклик - замість перемикачів показуємо ціль.
export const DifficultyPicker = ({ mode }: { mode: GameModeKey }) => {
    const t = useT();
    const difficulty = useDifficulty();
    const dailyRun = useDailyRun();

    if (dailyRun) {
        const dailyModifier = dailyRun.template.modifier;
        return (
            <>
            <DailyBanner>
                <span>
                    {dailyRun.kind === "campaign"
                        ? `${t("campaignLevel", { n: String((dailyRun.level ?? 0) + 1) })}: ${t(`level_${dailyRun.template.id}` as Parameters<typeof t>[0])}`
                        : `${t("dailyBadge", { n: String(dailyRun.day) })}: ${t(`daily_${dailyRun.template.id}` as Parameters<typeof t>[0])}`}
                </span>
                <Option type="button" $active={true} onClick={endDailyRun}>
                    {t("dailyLeave")}
                </Option>
            </DailyBanner>
            {dailyModifier && <ModifierHint>{t(`modifierDesc_${dailyModifier}`)}</ModifierHint>}
            </>
        );
    }

    return (
        <>
        <Group role="group" aria-label={t("difficultyLabel")}>
            {DIFFICULTIES.map((level) => (
                <Option
                    key={level}
                    type="button"
                    $active={difficulty === level}
                    aria-pressed={difficulty === level}
                    onClick={() => {
                        if (level === difficulty) return;
                        trackEvent("select_difficulty", { difficulty: level });
                        setDifficulty(level);
                    }}
                >
                    {t(`difficulty_${level}`)}
                </Option>
            ))}
        </Group>
        <ModifierPicker mode={mode} />
        </>
    );
};
