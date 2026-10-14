"use client";
import React, { useState } from "react";
import styled from "styled-components";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle, PillButton } from "@game/components/onlineStyles";
import { useT } from "@game/lib/i18n";

// Правила Ultimate показуються самі один раз - при першому вході в режим (позначка в
// localStorage); далі їх можна відкрити кнопкою "?" у рядку підказки над полем.
const SEEN_KEY = "ttt-ultimate-rules-seen";

const readSeen = (): boolean => {
    try {
        return localStorage.getItem(SEEN_KEY) === "1";
    } catch {
        return false;
    }
};

const markSeen = () => {
    try {
        localStorage.setItem(SEEN_KEY, "1");
    } catch {
        // Сховище недоступне - правила просто покажуться ще раз наступного разу.
    }
};

export const useUltimateRules = () => {
    const [open, setOpen] = useState(() => !readSeen());
    return {
        open,
        show: () => setOpen(true),
        close: () => {
            markSeen();
            setOpen(false);
        },
    };
};

const RulesList = styled.ol`
    margin: 4px 0 18px;
    padding-left: 22px;
    color: #5a3a17;
    font-size: 15px;
    line-height: 1.45;
    text-align: left;

    li + li {
        margin-top: 8px;
    }
`;

export const UltimateRulesModal = ({ onClose }: { onClose: () => void }) => {
    const t = useT();
    return (
        <>
            <Overlay onClick={onClose} />
            <ModalCard role="dialog" aria-modal="true" aria-labelledby="ultimate-rules-title" onClick={(e) => e.stopPropagation()}>
                <ModalCloseButton onClick={onClose} aria-label={t("close")}>
                    ×
                </ModalCloseButton>
                <ModalTitle id="ultimate-rules-title">{t("rulesTitle")}</ModalTitle>
                <RulesList>
                    <li>{t("rule1")}</li>
                    <li>{t("rule2")}</li>
                    <li>{t("rule3")}</li>
                    <li>{t("rule4")}</li>
                </RulesList>
                <PillButton type="button" onClick={onClose} autoFocus>
                    {t("gotIt")}
                </PillButton>
            </ModalCard>
        </>
    );
};

const HintRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 0 0 8px;
    min-height: 36px;
    color: #5a3a17;
    font-size: 15px;
    font-weight: 700;
    text-shadow: 0 1px 0 rgba(255, 250, 235, 0.8);
`;

const HelpButton = styled.button`
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    color: #6b4a25;
    font-size: 18px;
    font-weight: 800;
    background: linear-gradient(155deg, #f5e0b6 0%, #e6c890 100%);
    box-shadow:
        3px 3px 6px rgba(101, 72, 35, 0.3),
        -1px -1px 2px rgba(255, 250, 235, 0.5);
    touch-action: manipulation;

    &:focus-visible {
        outline: 3px solid #1fb3d9;
        outline-offset: 2px;
    }
`;

type UltimateHintProps = {
    // null - партія завершена, підказка не потрібна (лишається лише кнопка правил).
    state: "any" | "active" | "ai" | null;
    onShowRules: () => void;
};

export const UltimateHint: React.FC<UltimateHintProps> = ({ state, onShowRules }) => {
    const t = useT();
    const text =
        state === "any" ? t("hintAnyBoard") : state === "active" ? t("hintActiveBoard") : state === "ai" ? t("hintAiTurn") : "";
    return (
        <HintRow>
            <span aria-live="polite">{text}</span>
            <HelpButton type="button" onClick={onShowRules} aria-label={t("rulesButton")} title={t("rulesButton")}>
                ?
            </HelpButton>
        </HintRow>
    );
};
