"use client";
import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, getIdTokenResult, User } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/app/lib/firebase";
import { PillButton, TextInput, ErrorText } from "@/app/components/onlineStyles";
import {
    AdminPage,
    AdminHeader,
    AdminHeading,
    LoginCard,
    GhostButton,
    AdminShell,
    Sidebar,
    SidebarBrand,
    SidebarNav,
    SidebarItem,
    SidebarFooter,
    MainContent,
    MainContentInner,
} from "@/app/admin/adminStyles";
import { DashboardSection } from "@/app/admin/sections/DashboardSection";
import { ThemesSection } from "@/app/admin/sections/ThemesSection";
import { NamesSection } from "@/app/admin/sections/NamesSection";
import { SeoSection } from "@/app/admin/sections/SeoSection";

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

type AdminSection = "dashboard" | "themes" | "names" | "seo";

const NAV_ITEMS: { id: AdminSection; label: string }[] = [
    { id: "dashboard", label: "Дашборд" },
    { id: "themes", label: "Теми" },
    { id: "names", label: "Імена" },
    { id: "seo", label: "SEO" },
];

export default function AdminPageRoute() {
    const [authState, setAuthState] = useState<AdminAuthState>({ status: "loading" });
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);

    // Дашборд - стартовий розділ одразу після входу в адмінку.
    const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");

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
                    setActiveSection("dashboard");
                } else {
                    setAuthState({ status: "forbidden", email: u.email });
                }
            } catch {
                setAuthState({ status: "error", message: "Не вдалося перевірити права доступу. Спробуйте ще раз." });
            }
        });
    }, []);

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
        <AdminShell>
            <Sidebar>
                <SidebarBrand>Адмінка</SidebarBrand>
                <SidebarNav>
                    {NAV_ITEMS.map((item) => (
                        <SidebarItem
                            key={item.id}
                            type="button"
                            $active={activeSection === item.id}
                            onClick={() => setActiveSection(item.id)}
                        >
                            {item.label}
                        </SidebarItem>
                    ))}
                </SidebarNav>
                <SidebarFooter>
                    <GhostButton type="button" onClick={handleSignOut}>
                        Вийти ({user.email})
                    </GhostButton>
                </SidebarFooter>
            </Sidebar>

            <MainContent>
                <MainContentInner>
                    <AdminHeader style={{ margin: "0 0 20px" }}>
                        <AdminHeading>{NAV_ITEMS.find((item) => item.id === activeSection)?.label}</AdminHeading>
                    </AdminHeader>

                    {activeSection === "dashboard" && <DashboardSection />}
                    {activeSection === "themes" && <ThemesSection />}
                    {activeSection === "names" && <NamesSection />}
                    {activeSection === "seo" && <SeoSection />}
                </MainContentInner>
            </MainContent>
        </AdminShell>
    );
}
