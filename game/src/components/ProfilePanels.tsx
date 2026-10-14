"use client";
import React from "react";
import styled, { keyframes } from "styled-components";
import { Overlay } from "@game/components/gameStyles";
import { ModalCard, ModalCloseButton, ModalTitle, ModalSubtitle, PillButton } from "@game/components/onlineStyles";
import { Star } from "@game/components/DailyChallenge";
import { Coin } from "@game/components/SkinShop";
import { ACHIEVEMENTS, levelBounds, levelForXp, useProfile } from "@game/lib/profile";
import { CAMPAIGN_LEVELS, totalStars, useCampaign } from "@game/lib/campaign";
import { useWallet } from "@game/lib/wallet";
import { closePanel, useOpenPanel, useToasts } from "@game/lib/ui";
import { useT } from "@game/lib/i18n";

const Progress = styled.div`
    height: 10px;
    border-radius: 999px;
    background: #f1c88c;
    overflow: hidden;

    & > i {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #1fb3d9, #0f6f8c);
    }
`;

const Muted = styled.p`
    margin: 0;
    color: #6b4a25;
    font-size: 13px;
    line-height: 1.4;
`;

const List = styled.ul`
    list-style: none;
    margin: 8px 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Item = styled.li`
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 12px;
    align-items: center;
`;

const Medal = styled.span<{ $on: boolean }>`
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: ${({ $on }) => ($on ? "radial-gradient(circle at 35% 30%, #ffe28a, #f5b82e 60%, #c98a12)" : "#e7dccb")};
    box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.12);
`;

const ItemHead = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 8px;
    color: #4a2c0c;
    font-weight: 800;
    font-size: 14px;

    span:last-child {
        flex-shrink: 0;
        color: #7a5530;
        font-variant-numeric: tabular-nums;
    }
`;

const Stats = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 6px 0 10px;
`;

const Stat = styled.div`
    padding: 8px 4px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.55);
    text-align: center;
    color: #6b4a25;
    font-size: 12px;

    b {
        display: block;
        color: #4a2c0c;
        font-size: 22px;
        font-variant-numeric: tabular-nums;
    }
`;

const Pills = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 4px 0 8px;
`;

const Pill = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.6);
    color: #4a2c0c;
    font-weight: 800;
    font-size: 13px;
`;

const Modal: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => {
    const t = useT();
    return (
        <>
            <Overlay onClick={closePanel} style={{ zIndex: 1600 }} />
            <ModalCard role="dialog" aria-modal="true" aria-labelledby={id} onClick={(e) => e.stopPropagation()} style={{ zIndex: 1601 }}>
                <ModalCloseButton onClick={closePanel} aria-label={t("close")}>
                    ×
                </ModalCloseButton>
                <ModalTitle id={id}>{title}</ModalTitle>
                {children}
                <PillButton type="button" $variant="ghost" onClick={closePanel}>
                    {t("close")}
                </PillButton>
            </ModalCard>
        </>
    );
};

const AwardsPanel = () => {
    const t = useT();
    const profile = useProfile();
    useWallet();
    useCampaign();
    return (
        <Modal id="awards-title" title={t("awardsTitle")}>
            <Muted>{t("awardsHint")}</Muted>
            <List>
                {ACHIEVEMENTS.map((a) => {
                    const [have, need] = a.progress(profile);
                    const done = Boolean(profile.achieved[a.id]);
                    return (
                        <Item key={a.id}>
                            <Medal $on={done} aria-hidden="true">
                                <Star on={done} size={24} />
                            </Medal>
                            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                                <ItemHead>
                                    <span>{t(`ach_${a.id}` as Parameters<typeof t>[0])}</span>
                                    <span>
                                        {Math.min(have, need)} / {need}
                                    </span>
                                </ItemHead>
                                <Muted>
                                    {t(`achDesc_${a.id}` as Parameters<typeof t>[0])} · {t("awardsReward", { n: String(a.reward) })}
                                </Muted>
                                <Progress role="img" aria-label={`${Math.min(have, need)} / ${need}`}>
                                    <i style={{ width: `${Math.min(1, have / need) * 100}%` }} />
                                </Progress>
                            </div>
                        </Item>
                    );
                })}
            </List>
        </Modal>
    );
};

const ProfilePanel = ({ fallbackName }: { fallbackName: string | null }) => {
    const t = useT();
    const profile = useProfile();
    const wallet = useWallet();
    const campaign = useCampaign();
    const level = levelForXp(profile.xp);
    const [from, to] = levelBounds(level);
    const s = profile.stats;
    const achieved = ACHIEVEMENTS.filter((a) => profile.achieved[a.id]).length;
    const stats: [string, number][] = [
        ["stat_games", s.games],
        ["stat_wins", s.wins],
        ["stat_draws", s.draws],
        ["stat_bestStreak", s.bestStreak],
        ["stat_masterDraws", s.masterDraws],
        ["stat_onlineWins", s.onlineWins],
    ];
    return (
        <Modal id="profile-title" title={profile.name ?? fallbackName ?? t("player")}>
            <ModalSubtitle>{t("profileLevel", { n: String(level) })}</ModalSubtitle>
            <Progress role="img" aria-label={t("profileXp", { n: String(profile.xp - from), total: String(to - from), next: String(level + 1) })}>
                <i style={{ width: `${((profile.xp - from) / (to - from)) * 100}%` }} />
            </Progress>
            <Muted>{t("profileXp", { n: String(profile.xp - from), total: String(to - from), next: String(level + 1) })}</Muted>
            <Muted>{t("profileLevelHint")}</Muted>
            <Pills>
                <Pill>
                    <Coin size={16} /> {t("profileCoins")}: {wallet.coins}
                </Pill>
                <Pill>
                    <Star on size={16} /> {t("profileCampaign")}: {totalStars(campaign)} / {CAMPAIGN_LEVELS.length * 3}
                </Pill>
                <Pill>
                    {t("profileAwards")}: {achieved} / {ACHIEVEMENTS.length}
                </Pill>
            </Pills>
            <ModalSubtitle>{t("profileStats")}</ModalSubtitle>
            <Stats>
                {stats.map(([key, value]) => (
                    <Stat key={key}>
                        <b>{value}</b>
                        {t(key as Parameters<typeof t>[0])}
                    </Stat>
                ))}
            </Stats>
        </Modal>
    );
};

const toastIn = keyframes`
    from { opacity: 0; transform: translate(-50%, -8px); }
    to { opacity: 1; transform: translate(-50%, 0); }
`;

const ToastBox = styled.div`
    position: fixed;
    left: 50%;
    top: 60px;
    z-index: 1700;
    max-width: calc(100% - 32px);
    padding: 10px 16px;
    border-radius: 999px;
    background: #4a2c0c;
    color: #fff6e6;
    font-weight: 800;
    font-size: 14px;
    text-align: center;
    box-shadow: 0 10px 24px rgba(40, 24, 8, 0.35);
    transform: translateX(-50%);
    animation: ${toastIn} 0.3s ease both;
`;

// Вікна "Нагороди", "Профіль" і сповіщення про досягнення - один раз на сторінку.
export const ProfilePanels = ({ fallbackName }: { fallbackName: string | null }) => {
    const panel = useOpenPanel();
    const toasts = useToasts();
    return (
        <>
            {panel === "awards" && <AwardsPanel />}
            {panel === "profile" && <ProfilePanel fallbackName={fallbackName} />}
            {toasts.map((toast, index) => (
                <ToastBox key={toast.id} role="status" style={{ top: 60 + index * 48 }}>
                    {toast.text}
                </ToastBox>
            ))}
        </>
    );
};
