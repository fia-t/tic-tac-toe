import type { ThemeFx } from "@game/lib/themes";

// Оформлення вибраного скіна (сніг, бурульки, колір виграшу) вмикається атрибутом на <html>:
// стилі компонентів реагують на :root[data-fx="..."] (див. components/themeFxStyles.ts).
export const setThemeFx = (fx: ThemeFx | undefined): void => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (fx) root.dataset.fx = fx;
    else delete root.dataset.fx;
};
