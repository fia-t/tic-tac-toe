import type { ThemeFx } from "@game/lib/themes";

// Оформлення гри вмикається атрибутами на <html>, стилі реагують на них (components/themeFxStyles.ts):
// - data-fx: фон і декор (сніг, бурульки, іній) - від обраного скіна або від івенту, що йде зараз
//   (тоді навіть на "Класиці");
// - data-fx-glow: колір світіння виграшу - лише від обраного скіна (стосується його фішок).
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
