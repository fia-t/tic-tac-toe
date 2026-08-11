// Контракт postMessage-обміну з батьківською сторінкою ігрового порталу
// (Playwire/RAMP SDK підключений ТАМ, не тут - гра лише повідомляє про свій
// стан і слухає портал-команди через строго типізований конверт нижче).

// Окремо від siteConfig.name/shortName - це стабільний machine-readable
// ідентифікатор протоколу, який не повинен змінюватись разом із маркетинговою
// назвою сайту (SEO-ребрендинг тощо).
export const GAME_SOURCE = "tic-tac-toe";

export const MESSAGE_VERSION = 1;

export type OutgoingType =
    | "game:ready"
    | "game:started"
    | "game:resize"
    | "game:paused"
    | "game:resumed"
    | "game:over";

export type IncomingType =
    | "portal:pause"
    | "portal:resume"
    | "portal:mute"
    | "portal:unmute"
    | "portal:ad-started"
    | "portal:ad-finished"
    | "portal:ad-error";

export interface PortalMessage<T = Record<string, unknown>> {
    source: string;
    type: string;
    version: number;
    payload: T;
}

export const isPortalMessage = (data: unknown): data is PortalMessage => {
    return (
        typeof data === "object" &&
        data !== null &&
        typeof (data as Record<string, unknown>).type === "string"
    );
};
