"use client";
import { useEffect, useState } from "react";
import { TicTacToe } from "@game/components/tic-tac-toe";
import { setEmbed } from "@game/lib/embed";
import { setDifficulty } from "@game/lib/difficulty";
import { setModifier } from "@game/lib/modifiers";

// Режим вбудовування вмикається лише в браузері: на сервері модуль спільний для всіх запитів,
// і прапорець "протік" би на звичайні сторінки гри. До того - порожньо (гра й так чекає тем).
export const EmbedEntry = ({ skinId }: { skinId: string }) => {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        setEmbed({ skinId });
        // Відвідувач новини - легкий старт: легкий бот без модифікатора (вибори з сайту не діють).
        setDifficulty("easy");
        setModifier(null);
        setReady(true);
    }, [skinId]);
    // Онлайн-кімнат у вбудованій грі немає - кнопку "Гра з другом" сховано.
    return ready ? <TicTacToe onRoomReady={() => {}} /> : null;
};
