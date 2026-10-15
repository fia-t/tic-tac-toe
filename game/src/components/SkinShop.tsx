"use client";
import React from "react";
import styled from "styled-components";
import { GameButton } from "@game/components/GameButton";
import { Card, Muted, Page } from "@game/components/pageStyles";
import { CLASSIC_THEME, Theme, skinPrice } from "@game/lib/themes";
import { buySkin, equipSkin, getEquippedSkinId, isSkinUnlocked, startSkinTrial, useWallet } from "@game/lib/wallet";
import { useT } from "@game/lib/i18n";

// Магазин скінів (як у прототипі) - окрема сторінка нижнього меню: вступна картка з кнопкою
// "Грати зі скіном" і сітка карток скінів. Лічильник монет - у верхньому ряду (TopBar).

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

const SAMPLE: ("X" | "O" | null)[] = ["X", null, "O", null, "X", null, "O", null, "X"];

type ShopPageProps = {
    // Активні теми з адмінки - предмети магазину (поруч із вбудованою "Класикою").
    themes: Theme[];
    // Rewarded-реклама агрегатора: є - можна приміряти скін на 24 год. На порталі QS Play і
    // сайті не передається (там нема rewarded-реклами в грі).
    onRewardedAd?: () => Promise<boolean>;
    // "Грати зі скіном" - на поле.
    onPlay: () => void;
};

export const ShopPage: React.FC<ShopPageProps> = ({ themes, onRewardedAd, onPlay }) => {
    const t = useT();
    const wallet = useWallet();

    const skins = [CLASSIC_THEME, ...themes.filter((theme) => theme.id !== CLASSIC_THEME.id)];
    const equipped = getEquippedSkinId(wallet);
    const equippedSkin = skins.find((skin) => skin.id === equipped) ?? CLASSIC_THEME;

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
                <GameButton tone="primary" size="lg" block onClick={onPlay}>
                    {t("shopPlayWith", { name: equippedSkin.name })}
                </GameButton>
            </Card>

            <Grid aria-label={t("shopTitle")}>
                {skins.map((skin) => {
                    const price = skinPrice(skin);
                    const unlocked = isSkinUnlocked(skin.id, wallet);
                    const owned = wallet.owned.includes(skin.id);
                    const isOn = equipped === skin.id;
                    const trialLeftHours = !owned && unlocked ? Math.ceil(((wallet.trials[skin.id] ?? 0) - Date.now()) / 3_600_000) : 0;
                    const missing = price - wallet.coins;
                    const note =
                        trialLeftHours > 0
                            ? t("shopTrialLeft", { h: String(trialLeftHours) })
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
                                <Muted style={{ minHeight: 19 }}>{note}</Muted>
                            </div>
                            {isOn ? (
                                <GameButton size="lg" block disabled>
                                    {t("shopEquipped")}
                                </GameButton>
                            ) : unlocked ? (
                                <GameButton tone="primary" size="lg" block onClick={() => equipSkin(skin.id)}>
                                    {t("shopEquip")}
                                </GameButton>
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
