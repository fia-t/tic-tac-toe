import type { ThemeFx } from "@game/lib/themes";

// Оформлення гри вмикається атрибутами на <html>, стилі реагують на них (components/themeFxStyles.ts):
// - data-fx: фон і декор (сніг, бурульки, іній);
// - data-fx-glow: колір світіння виграшу (окремо - щоб за потреби їх можна було розвести).
const setAttr = (name: "fx" | "fxGlow", value: ThemeFx | undefined) => {
    const root = document.documentElement;
    if (value) root.dataset[name] = value;
    else delete root.dataset[name];
};

export const setThemeFx = (decor: ThemeFx | undefined, glow: ThemeFx | undefined = decor): void => {
    if (typeof document === "undefined") return;
    setAttr("fx", decor);
    setAttr("fxGlow", glow);
};
