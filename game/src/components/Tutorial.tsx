"use client";
import React, { useEffect, useState } from "react";
import styled, { createGlobalStyle, keyframes } from "styled-components";
import { GameButton } from "@game/components/GameButton";
import { IconClose } from "@game/components/GameIcons";
import { trackEvent } from "@game/lib/firebase";
import { useT } from "@game/lib/i18n";

// Легкий туторіал для нового гравця на першій партії: кілька карток унизу екрана, кожна
// підсвічує своє місце (поле, смугу над ним, бустери, логотип-меню). Не блокує гру - поле
// клікабельне; закривається хрестиком, "Пропустити" або після останнього кроку й більше не
// показується (localStorage). Гра з новини має свій коротший набір кроків і свій ключ.

const DONE_KEY = "ttt-tutorial-done";
export const EMBED_TUTORIAL_KEY = "ttt-embed-tutorial-done";

export const isTutorialDone = (key: string = DONE_KEY): boolean => {
    try {
        return localStorage.getItem(key) === "1";
    } catch {
        return false;
    }
};

const markDone = (key: string) => {
    try {
        localStorage.setItem(key, "1");
    } catch {
        // Сховище недоступне - туторіал може показатись ще раз, це не страшно.
    }
};

type StepNo = 1 | 2 | 3 | 4 | 5;
export type TutorialStep = { target: string; title: `tutorialTitle${StepNo}`; text: `tutorialText${StepNo}` };
const STEPS: TutorialStep[] = [
    { target: "board", title: "tutorialTitle1", text: "tutorialText1" },
    { target: "bar", title: "tutorialTitle2", text: "tutorialText2" },
    { target: "boosters", title: "tutorialTitle3", text: "tutorialText3" },
    { target: "menu", title: "tutorialTitle4", text: "tutorialText4" },
];

// Гра з новини: без меню; останній крок - повний екран, якщо iframe його дозволяє (кнопка є).
export const embedTutorialSteps = (): TutorialStep[] => [
    { target: "board", title: "tutorialTitle1", text: "tutorialText1" },
    { target: "bar", title: "tutorialTitle2", text: "tutorialText2" },
    { target: "boosters", title: "tutorialTitle3", text: "tutorialText3" },
    ...(document.querySelector('[data-tour="fullscreen"]') ? [{ target: "fullscreen", title: "tutorialTitle5", text: "tutorialText5" } as TutorialStep] : []),
];

// Нейтральне сяйво - кремове кільце з тонким темним контуром і м'яким світлим ореолом:
// пасує до будь-якого скіна поля і видно і на світлому, і на темному фоні.
const RING = "0 0 0 2px rgba(73, 48, 31, 0.55), 0 0 0 5px rgba(255, 250, 238, 0.95)";
const pulse = keyframes`
    0%, 100% { box-shadow: ${RING}, 0 0 12px 7px rgba(255, 250, 238, 0.75); }
    50% { box-shadow: ${RING}, 0 0 20px 13px rgba(255, 250, 238, 0.35); }
`;

// Підсвітка поточного місця - на елементі з data-tour="..." (GameScreen, TopBar).
const Highlight = createGlobalStyle<{ $target: string }>`
    [data-tour="${({ $target }) => $target}"] {
        border-radius: 18px;
        animation: ${pulse} 1.6s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
        [data-tour="${({ $target }) => $target}"] {
            animation: none;
            box-shadow: ${RING};
        }
    }
`;

const slideUp = keyframes`
    from { opacity: 0; transform: translate(-50%, 12px); }
    to { opacity: 1; transform: translate(-50%, 0); }
`;

const Card = styled.div`
    position: fixed;
    left: 50%;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    z-index: 1450;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: min(calc(100% - 32px), 440px);
    padding: 16px 16px 14px;
    border-radius: 22px;
    background: #fff6e6;
    box-shadow:
        inset 0 -5px 0 #ebcb98,
        0 16px 32px rgba(70, 40, 10, 0.25);
    color: #4a2c0c;
    transform: translateX(-50%);
    animation: ${slideUp} 0.3s ease both;

    h3 {
        margin: 0;
        padding-right: 40px;
        font-size: 19px;
        line-height: 1.1;
    }

    p {
        margin: 0;
        font-size: 15px;
        line-height: 1.4;
        color: #5b3f22;
    }
`;

const Close = styled(GameButton)`
    position: absolute;
    top: 10px;
    right: 10px;
`;

const Footer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
`;

const Dots = styled.div`
    display: flex;
    gap: 5px;
    margin-right: auto;

    i {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #e6cfa6;
    }

    i[data-on="true"] {
        background: #0f6f8c;
    }
`;

export const Tutorial: React.FC<{ onDone: () => void; steps?: TutorialStep[]; doneKey?: string }> = ({ onDone, steps = STEPS, doneKey = DONE_KEY }) => {
    const t = useT();
    const [step, setStep] = useState(0);
    const current = steps[step];

    useEffect(() => {
        trackEvent("tutorial_step", { step: step + 1 });
    }, [step]);

    // Поки відкрито туторіал - гра на паузі (App.tsx шле порталу gameplayStop/Start).
    useEffect(() => {
        trackEvent("tutorial_shown");
        return () => trackEvent("tutorial_closed");
    }, []);

    const finish = (how: "done" | "skip") => {
        markDone(doneKey);
        trackEvent("tutorial_finished", { how, step: step + 1 });
        onDone();
    };

    const last = step === steps.length - 1;
    return (
        <>
            <Highlight $target={current.target} />
            <Card role="dialog" aria-modal="false" aria-labelledby="tutorial-title">
                <Close size="xs" square aria-label={t("close")} onClick={() => finish("skip")} icon={<IconClose size={14} />} />
                <h3 id="tutorial-title">{t(current.title)}</h3>
                <p>{t(current.text)}</p>
                <Footer>
                    <Dots aria-label={`${step + 1} / ${steps.length}`}>
                        {steps.map((s, i) => (
                            <i key={s.target} data-on={i === step} />
                        ))}
                    </Dots>
                    {!last && (
                        <GameButton size="sm" onClick={() => finish("skip")}>
                            {t("tutorialSkip")}
                        </GameButton>
                    )}
                    <GameButton size="sm" tone="primary" onClick={() => (last ? finish("done") : setStep((s) => s + 1))}>
                        {last ? t("tutorialDone") : t("tutorialNext")}
                    </GameButton>
                </Footer>
            </Card>
        </>
    );
};
