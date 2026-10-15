"use client";
import { IconClose } from "@game/components/GameIcons";
import React, { useState } from "react";
import styled from "styled-components";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle, PillButton } from "@game/components/onlineStyles";
import { useT } from "@game/lib/i18n";

// Правила Ultimate показуються самі один раз - при першому вході в режим (позначка в
// localStorage).
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
                    <IconClose size={16} />
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
