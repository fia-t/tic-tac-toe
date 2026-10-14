"use client";
import styled from "styled-components";
import { DIFFICULTIES, setDifficulty, useDifficulty } from "@game/lib/difficulty";
import { trackEvent } from "@game/lib/firebase";
import { useT } from "@game/lib/i18n";

// Перемикач рівня ШІ над полем - у тому ж пісочному стилі, що й табло рахунку.
// Зміна рівня починає нову партію (це робить TicTacToe, підписаний на useDifficulty).
const Group = styled.div`
    display: inline-flex;
    gap: 4px;
    padding: 4px;
    margin: 0 0 8px;
    border-radius: 999px;
    background: linear-gradient(155deg, #f5e0b6 0%, #e6c890 100%);
    box-shadow:
        3px 3px 6px rgba(101, 72, 35, 0.25),
        -1px -1px 2px rgba(255, 250, 235, 0.5);
`;

const Option = styled.button<{ $active: boolean }>`
    min-height: 36px;
    padding: 6px 14px;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 700;
    color: ${({ $active }) => ($active ? "#fff8ec" : "#6b4a25")};
    background: ${({ $active }) => ($active ? "#8b5a2b" : "transparent")};
    box-shadow: ${({ $active }) => ($active ? "inset 0 -3px 0 rgba(0, 0, 0, 0.2)" : "none")};
    touch-action: manipulation;
    transition: background 0.15s ease;

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
    }
`;

export const DifficultyPicker = () => {
    const t = useT();
    const difficulty = useDifficulty();

    return (
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
    );
};
