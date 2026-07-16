"use client";
import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, getIdTokenResult, User } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/app/lib/firebase";
import {
    Theme,
    ThemeImageKind,
    getAllThemes,
    createTheme,
    updateTheme,
    deleteTheme,
    uploadThemeImage,
} from "@/app/lib/themes";
import { PillButton, TextInput, ErrorText } from "@/app/components/onlineStyles";
import {
    AdminPage,
    AdminHeader,
    AdminHeading,
    LoginCard,
    Section,
    SectionTitle,
    ThemeGrid,
    ThemeCard,
    ThumbRow,
    Thumb,
    ThemeName,
    ThemeActionsRow,
    SmallLabel,
    FileInput,
    CheckboxLabel,
    DangerButton,
    GhostButton,
    AddThemeRow,
} from "@/app/admin/adminStyles";

// Права адміна визначаються ВИКЛЮЧНО custom claim'ом `admin: true` у ID
// token (встановлюється лише через scripts/setAdminClaim.js, Firebase Admin
// SDK). Це той самий claim, що перевіряють firestore.rules/storage.rules -
// UI-перевірка тут лише для зручності інтерфейсу, а не єдиний захист.
type AdminAuthState =
    | { status: "loading" }
    | { status: "signed-out" }
    | { status: "forbidden"; email: string | null }
    | { status: "admin"; user: User }
    | { status: "error"; message: string };

const fieldForKind = (kind: ThemeImageKind): "backgroundUrl" | "xMarkerUrl" | "oMarkerUrl" =>
    kind === "background" ? "backgroundUrl" : kind === "x" ? "xMarkerUrl" : "oMarkerUrl";

const kindLabel: Record<ThemeImageKind, string> = {
    background: "Фон",
    x: "Скін X",
    o: "Скін O",
};

// Firebase-помилки (permission-denied, unauthenticated, тощо) мають код -
// показуємо його поруч із текстом, інакше "Не вдалося..." нічого не каже
// про справжню причину (протерміноване правило, ще не оновлений token і т.п.).
const describeError = (fallback: string, err: unknown): string => {
    const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : null;
    console.error(fallback, err);
    return code ? `${fallback} (${code})` : fallback;
};

export default function AdminPageRoute() {
    const [authState, setAuthState] = useState<AdminAuthState>({ status: "loading" });
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);

    const [themes, setThemes] = useState<Theme[]>([]);
    const [themesLoading, setThemesLoading] = useState(false);
    const [themesError, setThemesError] = useState<string | null>(null);
    const [busyThemeId, setBusyThemeId] = useState<string | null>(null);
    const [newThemeName, setNewThemeName] = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!isFirebaseConfigured) {
            setAuthState({
                status: "error",
                message: "Firebase не налаштовано. Заповніть NEXT_PUBLIC_FIREBASE_* у .env.local і перезапустіть сервер.",
            });
            return;
        }
        const auth = getFirebaseAuth();
        return onAuthStateChanged(auth, async (u) => {
            if (!u) {
                setAuthState({ status: "signed-out" });
                return;
            }
            try {
                // Примусове оновлення ID token: custom claims "запікаються" в токен
                // у момент його видачі, тож щойно встановлений admin:true інакше не
                // зʼявиться в уже відкритій/кешованій сесії до природного оновлення
                // токена (до ~1 години).
                const tokenResult = await getIdTokenResult(u, true);
                if (tokenResult.claims.admin === true) {
                    setAuthState({ status: "admin", user: u });
                } else {
                    setAuthState({ status: "forbidden", email: u.email });
                }
            } catch {
                setAuthState({ status: "error", message: "Не вдалося перевірити права доступу. Спробуйте ще раз." });
            }
        });
    }, []);

    const refreshThemes = async () => {
        setThemesLoading(true);
        setThemesError(null);
        try {
            setThemes(await getAllThemes());
        } catch (err) {
            setThemesError(describeError("Не вдалося завантажити список тем.", err));
        } finally {
            setThemesLoading(false);
        }
    };

    useEffect(() => {
        if (authState.status === "admin") void refreshThemes();
    }, [authState.status]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null);
        setLoginLoading(true);
        try {
            await signInWithEmailAndPassword(getFirebaseAuth(), loginEmail.trim(), loginPassword);
            // onAuthStateChanged вище сам підхопить нову сесію, примусово оновить
            // token і виставить "admin" або "forbidden" - дублювати перевірку тут не треба.
        } catch {
            setLoginError("Невірна пошта або пароль.");
        } finally {
            setLoginLoading(false);
        }
    };

    const handleSignOut = () => {
        setLoginEmail("");
        setLoginPassword("");
        void signOut(getFirebaseAuth());
    };

    const handleCreateTheme = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newThemeName.trim()) return;
        setCreating(true);
        try {
            await createTheme(newThemeName.trim());
            setNewThemeName("");
            await refreshThemes();
        } catch (err) {
            setThemesError(describeError("Не вдалося створити тему.", err));
        } finally {
            setCreating(false);
        }
    };

    const handleImageUpload = async (theme: Theme, kind: ThemeImageKind, file: File) => {
        setBusyThemeId(theme.id);
        setThemesError(null);
        try {
            const url = await uploadThemeImage(theme.id, file, kind);
            await updateTheme(theme.id, { [fieldForKind(kind)]: url });
            await refreshThemes();
        } catch (err) {
            setThemesError(describeError("Не вдалося завантажити зображення.", err));
        } finally {
            setBusyThemeId(null);
        }
    };

    const handleToggleActive = async (theme: Theme) => {
        setBusyThemeId(theme.id);
        try {
            await updateTheme(theme.id, { active: !theme.active });
            await refreshThemes();
        } catch (err) {
            setThemesError(describeError("Не вдалося оновити тему.", err));
        } finally {
            setBusyThemeId(null);
        }
    };

    const handleDelete = async (theme: Theme) => {
        if (!window.confirm(`Видалити тему "${theme.name}"?`)) return;
        setBusyThemeId(theme.id);
        try {
            await deleteTheme(theme.id);
            await refreshThemes();
        } catch (err) {
            setThemesError(describeError("Не вдалося видалити тему.", err));
        } finally {
            setBusyThemeId(null);
        }
    };

    if (authState.status === "error") {
        return (
            <AdminPage>
                <LoginCard>
                    <AdminHeading>Помилка</AdminHeading>
                    <ErrorText>{authState.message}</ErrorText>
                </LoginCard>
            </AdminPage>
        );
    }

    if (authState.status === "loading") {
        return <AdminPage />;
    }

    if (authState.status === "signed-out") {
        return (
            <AdminPage>
                <LoginCard>
                    <AdminHeading>Вхід в адмінку</AdminHeading>
                    <form onSubmit={handleLogin} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                        <TextInput
                            type="email"
                            placeholder="Пошта"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            autoFocus
                            required
                        />
                        <TextInput
                            type="password"
                            placeholder="Пароль"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                        />
                        {loginError && <ErrorText>{loginError}</ErrorText>}
                        <PillButton type="submit" disabled={loginLoading}>
                            {loginLoading ? "Входимо..." : "Увійти"}
                        </PillButton>
                    </form>
                </LoginCard>
            </AdminPage>
        );
    }

    if (authState.status === "forbidden") {
        return (
            <AdminPage>
                <LoginCard>
                    <AdminHeading>Access denied</AdminHeading>
                    <p style={{ margin: "0 0 4px" }}>
                        {authState.email ? `Акаунт ${authState.email}` : "Цей акаунт"} не має прав адміністратора
                        (відсутній custom claim <code>admin</code>).
                    </p>
                    <GhostButton type="button" onClick={handleSignOut} style={{ marginTop: 14 }}>
                        Вийти й спробувати інший акаунт
                    </GhostButton>
                </LoginCard>
            </AdminPage>
        );
    }

    // authState.status === "admin"
    const { user } = authState;

    return (
        <AdminPage>
            <AdminHeader>
                <AdminHeading>Теми (фон + скіни X/O)</AdminHeading>
                <GhostButton type="button" onClick={handleSignOut}>
                    Вийти ({user.email})
                </GhostButton>
            </AdminHeader>

            <Section>
                <SectionTitle>Нова тема</SectionTitle>
                <form onSubmit={handleCreateTheme}>
                    <AddThemeRow>
                        <TextInput
                            placeholder="Назва теми"
                            value={newThemeName}
                            onChange={(e) => setNewThemeName(e.target.value)}
                        />
                        <PillButton type="submit" disabled={creating || !newThemeName.trim()} style={{ marginTop: 0, width: "auto" }}>
                            {creating ? "Створюємо..." : "Додати"}
                        </PillButton>
                    </AddThemeRow>
                </form>
            </Section>

            <Section>
                <SectionTitle>Каталог ({themes.length})</SectionTitle>
                {themesError && <ErrorText>{themesError}</ErrorText>}
                {themesLoading ? (
                    <p>Завантаження...</p>
                ) : themes.length === 0 ? (
                    <p>Тем ще немає - додайте першу вище.</p>
                ) : (
                    <ThemeGrid>
                        {themes.map((theme) => {
                            const busy = busyThemeId === theme.id;
                            const complete = Boolean(theme.backgroundUrl && theme.xMarkerUrl && theme.oMarkerUrl);
                            return (
                                <ThemeCard key={theme.id} $active={theme.active}>
                                    <ThemeName>{theme.name}</ThemeName>
                                    <ThumbRow>
                                        <Thumb $src={theme.backgroundUrl} title="Фон" />
                                        <Thumb $src={theme.xMarkerUrl} title="X" />
                                        <Thumb $src={theme.oMarkerUrl} title="O" />
                                    </ThumbRow>

                                    {(["background", "x", "o"] as ThemeImageKind[]).map((kind) => (
                                        <SmallLabel key={kind}>
                                            {kindLabel[kind]}
                                            <FileInput
                                                type="file"
                                                accept="image/*"
                                                disabled={busy}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) void handleImageUpload(theme, kind, file);
                                                    e.target.value = "";
                                                }}
                                            />
                                        </SmallLabel>
                                    ))}

                                    {!complete && <ErrorText style={{ margin: 0 }}>Додайте всі 3 зображення, щоб тема стала доступною в грі.</ErrorText>}

                                    <ThemeActionsRow>
                                        <CheckboxLabel>
                                            <input
                                                type="checkbox"
                                                checked={theme.active}
                                                disabled={busy || !complete}
                                                onChange={() => void handleToggleActive(theme)}
                                            />
                                            Активна
                                        </CheckboxLabel>
                                        <DangerButton type="button" disabled={busy} onClick={() => void handleDelete(theme)}>
                                            Видалити
                                        </DangerButton>
                                    </ThemeActionsRow>
                                </ThemeCard>
                            );
                        })}
                    </ThemeGrid>
                )}
            </Section>
        </AdminPage>
    );
}
