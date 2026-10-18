"use client";
import { collection, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@game/lib/firebase";
import { ALL_MODIFIERS, type Modifier } from "@game/lib/modifiers";

// Каталог модифікаторів в адмінці (розділ "Модифікатори"): які з них пропонуються в редакторі
// кампанії. Правила самих модифікаторів - у коді (modEngine.ts), тут лише налаштування.
// Firestore: modifierSettings/{modifierId}. Документа немає - модифікатор доступний.

export type ModifierSetting = {
    // Пропонувати в редакторі рівнів кампанії.
    campaign: boolean;
};

export type ModifierSettings = Record<Modifier, ModifierSetting>;

const COLLECTION = "modifierSettings";

export const DEFAULT_MODIFIER_SETTINGS: ModifierSettings = Object.fromEntries(ALL_MODIFIERS.map((m) => [m, { campaign: true }])) as ModifierSettings;

export const getModifierSettings = async (): Promise<ModifierSettings> => {
    const snap = await getDocs(collection(getFirebaseDb(), COLLECTION));
    const settings: ModifierSettings = { ...DEFAULT_MODIFIER_SETTINGS };
    snap.docs.forEach((d) => {
        if (!ALL_MODIFIERS.includes(d.id as Modifier)) return;
        settings[d.id as Modifier] = { campaign: d.data().campaign !== false };
    });
    return settings;
};

export const saveModifierSetting = async (id: Modifier, setting: ModifierSetting): Promise<void> => {
    await setDoc(doc(getFirebaseDb(), COLLECTION, id), { ...setting, updatedAt: serverTimestamp() });
};
