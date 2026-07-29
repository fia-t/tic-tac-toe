/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_TARGET?: "crazygames" | "poki" | "itch";
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
