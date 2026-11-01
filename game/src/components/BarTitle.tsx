"use client";
import React from "react";
import styled from "styled-components";
import { GREETING_IN_BAR, barColumnCss } from "@game/components/pageStyles";
import { InfoTip } from "@game/components/HomeScreen";

// Заголовки сторінок меню (скіни, нагороди, профіль) на широкому екрані - у шапці по ширині
// колонки, як привітання на головній; картка-заголовок на самій сторінці тоді прихована (PageOnly).

export const BarSlot = styled.div`
    display: none;

    @media ${GREETING_IN_BAR} {
        display: flex;
        align-items: center;
        gap: 10px;
        ${barColumnCss}
    }

    h1 {
        margin: 0;
        font-size: 30px;
        line-height: 1.05;
        color: #4a2c0c;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`;

// Те, що на широкому екрані вже показано в шапці.
export const PageOnly = styled.div`
    display: contents;

    @media ${GREETING_IN_BAR} {
        display: none;
    }
`;

export const PageBarTitle: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
    <BarSlot>
        <h1>{title}</h1>
        {hint && <InfoTip text={hint} />}
    </BarSlot>
);
