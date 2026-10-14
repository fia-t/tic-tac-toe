"use client";
import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle, PillButton } from "@game/components/onlineStyles";
import { CLASSIC_THEME, Theme, skinPrice } from "@game/lib/themes";
import { buySkin, equipSkin, getEquippedSkinId, isSkinUnlocked, startSkinTrial, useLastEarning, useWallet } from "@game/lib/wallet";
import { useT } from "@game/lib/i18n";

// Лічильник монет (у ряду кнопок зліва вгорі, поруч із викликом дня) і магазин скінів.
const CoinButton = styled.button`
    position: relative;
    height: 40px;
    padding: 0 12px 0 8px;
    border: none;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    color: #6b4a25;
    font-weight: 800;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
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

const rise = keyframes`
    0% { opacity: 0; transform: translateY(4px); }
    15% { opacity: 1; transform: translateY(0); }
    80% { opacity: 1; transform: translateY(-6px); }
    100% { opacity: 0; transform: translateY(-12px); }
`;

const EarnBubble = styled.span`
    position: absolute;
    left: calc(100% + 6px);
    top: 8px;
    padding: 2px 8px;
    border-radius: 999px;
    background: #2f8a3e;
    color: #ffffff;
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
    pointer-events: none;
    animation: ${rise} 1.8s ease-out forwards;

    @media (prefers-reduced-motion: reduce) {
        animation-duration: 1.8s;
        animation-timing-function: steps(1, end);
    }
`;

export const Coin = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <defs>
            <radialGradient id="coin-g" cx="0.35" cy="0.3" r="0.8">
                <stop offset="0" stopColor="#ffe28a" />
                <stop offset="0.55" stopColor="#f5b82e" />
                <stop offset="1" stopColor="#c98a12" />
            </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="10.5" fill="url(#coin-g)" stroke="#a8730d" strokeWidth="1" />
        <circle cx="12" cy="12" r="7" fill="none" stroke="#fff3c4" strokeOpacity="0.7" strokeWidth="1.4" />
    </svg>
);

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 8px 0 4px;
`;

const Card = styled.div<{ $on: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    padding: 8px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.55);
    box-shadow: ${({ $on }) => ($on ? "inset 0 0 0 3px #0f6f8c" : "inset 0 0 0 2px #e6c890")};
`;

const Preview = styled.div<{ $bg: string }>`
    position: relative;
    aspect-ratio: 1;
    border-radius: 12px;
    overflow: hidden;
    background: url("${({ $bg }) => $bg}") center / cover no-repeat;
    box-shadow: inset 0 -4px 0 rgba(101, 72, 35, 0.25);
`;

const PreviewPiece = styled.img<{ $left: string; $top: string }>`
    position: absolute;
    left: ${({ $left }) => $left};
    top: ${({ $top }) => $top};
    width: 40%;
    height: 40%;
    object-fit: contain;
`;

const SkinName = styled.div`
    font-weight: 800;
    color: #4a2c0c;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const Note = styled.div`
    min-height: 16px;
    font-size: 12px;
    color: #7a5530;
`;

const SmallButton = styled(PillButton)`
    margin-top: 0;
    padding: 8px 10px;
    min-height: 38px;
    font-size: 13px;
`;

const Hint = styled.p`
    margin: 0;
    color: #6b4a25;
    font-size: 13px;
    line-height: 1.4;
`;

type SkinShopProps = {
    // Активні теми з адмінки - предмети магазину (поруч із вбудованою "Класикою").
    themes: Theme[];
    // Rewarded-реклама агрегатора: є - можна приміряти скін на 24 год. На порталі QS Play і
    // сайті не передається (там нема rewarded-реклами в грі).
    onRewardedAd?: () => Promise<boolean>;
};

export const SkinShop: React.FC<SkinShopProps> = ({ themes, onRewardedAd }) => {
    const t = useT();
    const wallet = useWallet();
    const earning = useLastEarning();
    const [open, setOpen] = useState(false);
    const [bubble, setBubble] = useState<number | null>(null);

    // "+N" біля лічильника на кожне нарахування.
    useEffect(() => {
        if (!earning || Date.now() - earning.at > 2000) return;
        setBubble(earning.amount);
        const timer = setTimeout(() => setBubble(null), 1800);
        return () => clearTimeout(timer);
    }, [earning]);

    const skins = [CLASSIC_THEME, ...themes.filter((theme) => theme.id !== CLASSIC_THEME.id)];
    const equipped = getEquippedSkinId(wallet);

    const trial = async (id: string) => {
        if (!onRewardedAd) return;
        const watched = await onRewardedAd();
        if (watched) startSkinTrial(id);
    };

    return (
        <>
            <CoinButton type="button" onClick={() => setOpen(true)} aria-label={t("shopOpen", { n: String(wallet.coins) })} title={t("shopTitle")}>
                <Coin />
                <span>{wallet.coins}</span>
                {bubble !== null && <EarnBubble aria-hidden="true">+{bubble}</EarnBubble>}
            </CoinButton>

            {open && (
                <>
                    <Overlay onClick={() => setOpen(false)} style={{ zIndex: 1600 }} />
                    <ModalCard role="dialog" aria-modal="true" aria-labelledby="shop-title" onClick={(e) => e.stopPropagation()} style={{ zIndex: 1601 }}>
                        <ModalCloseButton onClick={() => setOpen(false)} aria-label={t("close")}>
                            ×
                        </ModalCloseButton>
                        <ModalTitle id="shop-title">{t("shopTitle")}</ModalTitle>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, color: "#4a2c0c" }}>
                            <Coin /> {t("shopCoins", { n: String(wallet.coins) })}
                        </div>
                        <Hint>{t("shopHint")}</Hint>
                        <Grid>
                            {skins.map((skin) => {
                                const price = skinPrice(skin);
                                const unlocked = isSkinUnlocked(skin.id, wallet);
                                const owned = wallet.owned.includes(skin.id);
                                const isOn = equipped === skin.id;
                                const trialLeftHours = !owned && unlocked ? Math.ceil(((wallet.trials[skin.id] ?? 0) - Date.now()) / 3_600_000) : 0;
                                const missing = price - wallet.coins;
                                return (
                                    <Card key={skin.id} $on={isOn}>
                                        <Preview $bg={skin.backgroundUrl}>
                                            <PreviewPiece src={skin.xMarkerUrl} alt="" $left="8%" $top="10%" />
                                            <PreviewPiece src={skin.oMarkerUrl} alt="" $left="52%" $top="50%" />
                                        </Preview>
                                        <SkinName title={skin.name}>{skin.name}</SkinName>
                                        <Note>
                                            {trialLeftHours > 0
                                                ? t("shopTrialLeft", { h: String(trialLeftHours) })
                                                : !unlocked && price > 0 && missing > 0
                                                ? t("shopNotEnough", { n: String(missing) })
                                                : ""}
                                        </Note>
                                        {isOn ? (
                                            <SmallButton type="button" $variant="ghost" disabled>
                                                {t("shopEquipped")}
                                            </SmallButton>
                                        ) : unlocked ? (
                                            <SmallButton type="button" onClick={() => equipSkin(skin.id)}>
                                                {t("shopEquip")}
                                            </SmallButton>
                                        ) : (
                                            <>
                                                <SmallButton type="button" disabled={missing > 0} onClick={() => buySkin(skin.id, price)}>
                                                    {price > 0 ? t("shopBuy", { n: String(price) }) : t("shopFree")}
                                                </SmallButton>
                                                {onRewardedAd && (
                                                    <SmallButton type="button" $variant="ghost" onClick={() => void trial(skin.id)}>
                                                        {t("shopTrial")}
                                                    </SmallButton>
                                                )}
                                            </>
                                        )}
                                    </Card>
                                );
                            })}
                        </Grid>
                        <PillButton type="button" $variant="ghost" onClick={() => setOpen(false)}>
                            {t("close")}
                        </PillButton>
                    </ModalCard>
                </>
            )}
        </>
    );
};
