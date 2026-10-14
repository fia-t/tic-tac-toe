import { IconFriends, IconMode3, IconMode5, IconModeUltimate, IconRestart } from "@game/components/GameIcons";
import React, { useState } from "react";
import { GameLayout, BoardColumn, BoardContainer, Cell, ButtonContainer, Button, ControlIcon, ButtonWithTooltip, Tooltip } from "@game/components/gameStyles";
import { FriendGameModal } from "@game/components/FriendGameModal";
import { GamePiece } from "@game/components/GamePiece";
import { trackEvent } from "@game/lib/firebase";
import { assetUrl } from "@game/lib/assets";
import { useT } from "@game/lib/i18n";

type BoardProps = {
    board: (string | null)[][];
    handleClick: (row: number, col: number) => void;
    restartGame: () => void;  // Додаємо пропс для перезапуску гри
    setGameMode: (mode: "traditional" | "difficult" | "five") => void;
    backgroundUrl?: string;
    scoreBoard?: React.ReactNode;
    onRoomReady: (roomId: string) => void;
    onBeforeFriendOpen?: () => Promise<boolean>;
    // Плоскі індекси клітинок переможної лінії - підсвічуються після кінця партії.
    winningCells?: Set<number>;
    // Зникаючі фішки: клітинки з фішками, що зникнуть наступним ходом.
    fadingCells?: Set<number>;
};

export const Board: React.FC<BoardProps> = ({
    board,
    handleClick,
    restartGame,
    setGameMode,
    backgroundUrl,
    scoreBoard,
    onRoomReady,
    onBeforeFriendOpen,
    winningCells,
    fadingCells,
}) => {
    const t = useT();
    const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);

    const handleFriendClick = async () => {
        trackEvent("friend_modal_open", { from: "easy" });
        if (onBeforeFriendOpen) {
            const allowed = await onBeforeFriendOpen();
            if (!allowed) return;
        }
        setIsFriendModalOpen(true);
    };

    return (
        <GameLayout>
            <BoardColumn>
                {scoreBoard}
                <BoardContainer $backgroundUrl={backgroundUrl}>
                    {/* Ячейки */}
                    {board.flat().map((cell, index) => {
                        const rowIndex = Math.floor(index / 3);
                        const cellIndex = index % 3;
                        return (
                            <Cell
                                key={index}
                                onClick={(e) => { e.stopPropagation(); handleClick(rowIndex, cellIndex); }}
                            >
                                {cell && <GamePiece src={cell} winning={winningCells?.has(index)} fading={fadingCells?.has(index)} />}
                            </Cell>
                        );
                    })}
                </BoardContainer>
            </BoardColumn>

            {/* Кнопка перезапуску тепер отримує restartGame з пропсів */}
            <ButtonContainer>
                <Button onClick={restartGame} aria-label={t("restart")}>
                    <IconRestart size={30} />
                </Button>
                <ButtonWithTooltip>
                    <Button
                        onClick={() => {
                            trackEvent("select_mode", { mode: "easy" });
                            setGameMode("traditional");
                        }}
                        aria-label={t("modeClassic")}
                    >
                        <IconMode3 size={42} />
                    </Button>
                    <Tooltip>3×3</Tooltip>
                </ButtonWithTooltip>
                <ButtonWithTooltip>
                    <Button
                        onClick={() => {
                            trackEvent("select_mode", { mode: "five" });
                            setGameMode("five");
                        }}
                        aria-label={t("modeFive")}
                    >
                        <IconMode5 size={42} />
                    </Button>
                    <Tooltip>5×5</Tooltip>
                </ButtonWithTooltip>
                <ButtonWithTooltip>
                    <Button
                        onClick={() => {
                            trackEvent("select_mode", { mode: "hard" });
                            setGameMode("difficult");
                        }}
                        aria-label={t("modeHard")}
                    >
                        <IconModeUltimate size={42} />
                    </Button>
                    <Tooltip>{t("tooltipHard")}</Tooltip>
                </ButtonWithTooltip>
                <ButtonWithTooltip>
                    <Button onClick={handleFriendClick} aria-label={t("playWithFriend")}>
                        <IconFriends size={44} />
                    </Button>
                    <Tooltip>{t("tooltipFriend")}</Tooltip>
                </ButtonWithTooltip>
            </ButtonContainer>

            {isFriendModalOpen && (
                <FriendGameModal
                    onClose={() => setIsFriendModalOpen(false)}
                    onRoomReady={onRoomReady}
                    defaultMode="3x3"
                />
            )}
        </GameLayout>
    );
};
