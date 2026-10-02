import {
    GAME_SOURCE,
    MESSAGE_VERSION,
    IncomingType,
    OutgoingType,
    PortalMessage,
    isPortalMessage,
} from "./messageTypes";

// Причина, з якої гра зараз заблокована для гравця. Множина, а не один
// boolean, - щоб portal:ad-finished/ad-error не знімали паузу, поставлену
// портал-командою чи фоном вкладки (п.12 ТЗ: "відновити, лише якщо до
// реклами гру не було поставлено на паузу").
type BlockReason = "ad" | "portal" | "hidden";

type DebugDirection = "in" | "out" | "info" | "error";

// Мапа вхідних portal:* команд на дію - навмисно ізольована в одному місці
// (п.13 ТЗ), щоб перейменувати події після отримання документації порталу
// можна було, змінивши лише цей об'єкт.
const INCOMING_HANDLERS: Record<IncomingType, (bridge: PortalBridge) => void> = {
    "portal:pause": (b) => b.addBlockReason("portal"),
    "portal:resume": (b) => b.removeBlockReason("portal"),
    "portal:mute": (b) => b.setMuted(true),
    "portal:unmute": (b) => b.setMuted(false),
    "portal:ad-started": (b) => b.addBlockReason("ad"),
    "portal:ad-finished": (b) => b.removeBlockReason("ad"),
    "portal:ad-error": (b) => b.removeBlockReason("ad"),
};

const muteAllMedia = (muted: boolean) => {
    // Зараз у грі немає жодного audio/video елемента - це forward-compatible
    // no-op. Якщо звук колись з'явиться, він автоматично підхопить це правило.
    document.querySelectorAll("audio, video").forEach((el) => {
        (el as HTMLMediaElement).muted = muted;
    });
};

export class PortalBridge {
    private readonly origin: string;
    private readonly debug: boolean;
    private reasons = new Set<BlockReason>();
    private blockedListeners = new Set<(blocked: boolean) => void>();
    private resizeObserver: ResizeObserver | null = null;
    private resizeTimer: ReturnType<typeof setTimeout> | null = null;
    private messageHandler: ((event: MessageEvent) => void) | null = null;
    private visibilityHandler: (() => void) | null = null;

    constructor(origin: string) {
        this.origin = origin;
        this.debug =
            typeof window !== "undefined" &&
            new URLSearchParams(window.location.search).get("portalDebug") === "1";
    }

    get blocked(): boolean {
        return this.reasons.size > 0;
    }

    init(): void {
        if (typeof window === "undefined") return;

        this.debugLog("info", {
            inIframe: window.self !== window.top,
            portalOrigin: this.origin,
            viewport: this.currentViewport(),
        });

        this.messageHandler = (event: MessageEvent) => this.handleMessage(event);
        window.addEventListener("message", this.messageHandler);

        this.visibilityHandler = () => this.handleVisibilityChange();
        document.addEventListener("visibilitychange", this.visibilityHandler);

        this.resizeObserver = new ResizeObserver(() => this.scheduleResizeNotify());
        this.resizeObserver.observe(document.documentElement);
    }

    destroy(): void {
        if (typeof window === "undefined") return;
        if (this.messageHandler) window.removeEventListener("message", this.messageHandler);
        if (this.visibilityHandler) document.removeEventListener("visibilitychange", this.visibilityHandler);
        this.resizeObserver?.disconnect();
        if (this.resizeTimer) clearTimeout(this.resizeTimer);
        this.blockedListeners.clear();
    }

    subscribe(listener: (blocked: boolean) => void): () => void {
        this.blockedListeners.add(listener);
        return () => this.blockedListeners.delete(listener);
    }

    notifyReady(): void {
        this.send("game:ready", {});
    }

    notifyStarted(): void {
        this.send("game:started", {});
    }

    notifyGameOver(payload: Record<string, unknown>): void {
        this.send("game:over", payload);
    }

    // --- internal ---

    private handleMessage(event: MessageEvent): void {
        // п.9 ТЗ: вхідні повідомлення обробляються лише після перевірки origin.
        if (event.origin !== this.origin) return;

        if (!isPortalMessage(event.data)) {
            this.debugLog("error", { reason: "malformed message", origin: event.origin });
            return;
        }

        this.debugLog("in", event.data);

        const handler = INCOMING_HANDLERS[event.data.type as IncomingType];
        if (!handler) {
            this.debugLog("error", { reason: "unknown message type", type: event.data.type });
            return;
        }
        handler(this);
    }

    private handleVisibilityChange(): void {
        if (document.hidden) {
            this.addBlockReason("hidden");
        } else {
            this.removeBlockReason("hidden");
        }
    }

    addBlockReason(reason: BlockReason): void {
        const wasBlocked = this.blocked;
        this.reasons.add(reason);
        if (!wasBlocked) {
            muteAllMedia(true);
            this.send("game:paused", { reason });
            this.notifyBlockedListeners();
        }
    }

    removeBlockReason(reason: BlockReason): void {
        const wasBlocked = this.blocked;
        this.reasons.delete(reason);
        if (wasBlocked && !this.blocked) {
            muteAllMedia(false);
            this.send("game:resumed", {});
            this.notifyBlockedListeners();
        }
    }

    setMuted(muted: boolean): void {
        muteAllMedia(muted);
    }

    private notifyBlockedListeners(): void {
        this.blockedListeners.forEach((listener) => listener(this.blocked));
    }

    private currentViewport(): { width: number; height: number } {
        return { width: window.innerWidth, height: window.innerHeight };
    }

    private scheduleResizeNotify(): void {
        if (this.resizeTimer) clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
            this.send("game:resize", this.currentViewport());
        }, 150);
    }

    private send(type: OutgoingType, payload: Record<string, unknown>): void {
        const message: PortalMessage = {
            source: GAME_SOURCE,
            type,
            version: MESSAGE_VERSION,
            payload,
        };

        this.debugLog("out", message);

        if (typeof window === "undefined" || window.parent === window) return;
        // п.8 ТЗ: вихідні повідомлення завжди йдуть на конкретний origin, ніколи "*".
        window.parent.postMessage(message, this.origin);
    }

    private debugLog(direction: DebugDirection, data: unknown): void {
        if (!this.debug) return;
        console.log(`[portal:${direction}]`, data);
    }
}
