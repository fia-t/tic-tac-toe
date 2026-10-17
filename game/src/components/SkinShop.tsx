"use client";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { GameButton } from "@game/components/GameButton";
import { Card, Muted, Page } from "@game/components/pageStyles";
import { CLASSIC_THEME, Theme, skinPrice } from "@game/lib/themes";
import { buySkin, equipSkin, getEquippedSkinId, isSkinUnlocked, startSkinTrial, useWallet } from "@game/lib/wallet";
import { useT } from "@game/lib/i18n";

// Магазин скінів (як у прототипі) - окрема сторінка нижнього меню: заголовок із коротким поясненням
// і сітка карток скінів. Доступний скін - одразу кнопка "Грати" (обирає його й веде на поле), без
// окремого кроку "Обрати"; під кнопкою - скільки скін ще діятиме. Евентові скіни - першими.
// Лічильник монет - у верхньому ряду (TopBar).

// Монета: темніший край знизу, світлий обідок, внутрішнє коло й відблиск - як у прототипі.
export const Coin = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
        <defs>
            <linearGradient id="coin-rim" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffe590" />
                <stop offset="1" stopColor="#e19912" />
            </linearGradient>
            <linearGradient id="coin-face" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffcf4d" />
                <stop offset="1" stopColor="#f2a818" />
            </linearGradient>
        </defs>
        <circle cx="12" cy="12.6" r="11" fill="#b5700a" />
        <circle cx="12" cy="11.6" r="10.6" fill="url(#coin-rim)" />
        <circle cx="12" cy="11.6" r="7.6" fill="url(#coin-face)" stroke="#c7850f" strokeWidth="1" />
        <path d="M5.2 8.2a7.6 7.6 0 0 1 4.4-4" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
);

const Grid = styled.section`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
`;

const SkinCard = styled.div<{ $on: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    padding: 12px;
    border-radius: 20px;
    background: #ffe9c8;
    box-shadow: ${({ $on }) => ($on ? "inset 0 0 0 3px #1fb3d9" : "inset 0 0 0 2px #ebcb98")};

    h3 {
        margin: 0;
        font-size: 19px;
        line-height: 1.05;
        color: #4a2c0c;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

// Прев'ю - маленьке поле 3×3 у фоні скіна з кількома фішками.
const Preview = styled.div<{ $bg: string }>`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
    padding: 7px;
    border-radius: 16px;
    background: url("${({ $bg }) => $bg}") center / cover no-repeat;
    box-shadow: inset 0 -5px 0 rgba(176, 115, 45, 0.35);
`;

const PreviewCell = styled.div`
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.16);
    box-shadow: inset 0 3px 6px rgba(120, 80, 30, 0.22);

    img {
        width: 72%;
        height: 72%;
        object-fit: contain;
    }
`;

// Під кнопкою: пробний скін - зворотний відлік, куплений - "назавжди".
const Term = styled.div<{ $forever?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 800;
    color: ${({ $forever }) => ($forever ? "#0f6f8c" : "#b8730c")};
    text-align: center;
`;

const Clock = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l3 2M9 2h6" />
    </svg>
);

const SAMPLE: ("X" | "O" | null)[] = ["X", null, "O", null, "X", null, "O", null, "X"];

type ShopPageProps = {
    // Активні теми з адмінки - предмети магазину (поруч із вбудованою "Класикою").
    themes: Theme[];
    // Rewarded-реклама агрегатора: є - можна приміряти скін на 24 год. На порталі QS Play і
    // сайті не передається (там нема rewarded-реклами в грі).
    onRewardedAd?: () => Promise<boolean>;
    // "Грати" на картці скіна - на поле (скін уже обрано).
    onPlay: () => void;
};

export const ShopPage: React.FC<ShopPageProps> = ({ themes, onRewardedAd, onPlay }) => {
    const t = useT();
    const wallet = useWallet();

    // Відлік пробних скінів оновлюється щохвилини; коли час вийшов - картка повертається до ціни.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(timer);
    }, []);

    // Евентові (сезонні) скіни - на початку списку.
    const skins = [CLASSIC_THEME, ...themes.filter((theme) => theme.id !== CLASSIC_THEME.id)].sort((a, b) => Number(Boolean(b.event)) - Number(Boolean(a.event)));
    const equipped = getEquippedSkinId(wallet);

    const play = (id: string) => {
        equipSkin(id);
        onPlay();
    };
    const termLeft = (until: number) => {
        const minutes = Math.max(0, Math.ceil((until - now) / 60_000));
        return t("shopTermLeft", { h: String(Math.floor(minutes / 60)), m: String(minutes % 60) });
    };

    const trial = async (id: string) => {
        if (!onRewardedAd) return;
        const watched = await onRewardedAd();
        if (watched) startSkinTrial(id);
    };

    return (
        <Page>
            <Card aria-labelledby="shop-title">
                <h2 id="shop-title">{t("shopTitle")}</h2>
                <Muted>{t("shopHint")}</Muted>
            </Card>

            <Grid aria-label={t("shopTitle")}>
                {skins.map((skin) => {
                    const price = skinPrice(skin);
                    const unlocked = isSkinUnlocked(skin.id, wallet);
                    const owned = wallet.owned.includes(skin.id);
                    const isOn = equipped === skin.id;
                    const trialUntil = !owned && unlocked ? wallet.trials[skin.id] ?? 0 : 0;
                    const missing = price - wallet.coins;
                    const note = isOn
                        ? `✓ ${t("shopEquipped")}`
                        : !unlocked && price > 0 && missing > 0
                            ? t("shopNotEnough", { n: String(missing) })
                            : price > 0 && !unlocked
                            ? t("shopPremium")
                            : "";
                    return (
                        <SkinCard key={skin.id} $on={isOn}>
                            <Preview $bg={skin.backgroundUrl} aria-hidden="true">
                                {SAMPLE.map((v, i) => (
                                    <PreviewCell key={i}>{v && <img src={v === "X" ? skin.xMarkerUrl : skin.oMarkerUrl} alt="" />}</PreviewCell>
                                ))}
                            </Preview>
                            <div>
                                <h3 title={skin.name}>{skin.name}</h3>
                                <Muted style={{ minHeight: 19, color: isOn ? "#0f6f8c" : undefined, fontWeight: isOn ? 800 : undefined }}>{note}</Muted>
                            </div>
                            {unlocked ? (
                                <>
                                    <GameButton tone="primary" size="lg" block onClick={() => play(skin.id)}>
                                        {t("homePlay")}
                                    </GameButton>
                                    {trialUntil > now ? (
                                        <Term>
                                            <Clock />
                                            {termLeft(trialUntil)}
                                        </Term>
                                    ) : owned && price > 0 ? (
                                        <Term $forever>∞ {t("shopForever")}</Term>
                                    ) : null}
                                </>
                            ) : (
                                <>
                                    <GameButton tone="primary" size="lg" block disabled={missing > 0} onClick={() => buySkin(skin.id, price)}>
                                        {price > 0 ? (
                                            <>
                                                <Coin size={18} />
                                                {price}
                                            </>
                                        ) : (
                                            t("shopFree")
                                        )}
                                    </GameButton>
                                    {onRewardedAd && (
                                        <GameButton size="lg" block onClick={() => void trial(skin.id)}>
                                            {t("shopTrial")}
                                        </GameButton>
                                    )}
                                </>
                            )}
                        </SkinCard>
                    );
                })}
            </Grid>
        </Page>
    );
};
