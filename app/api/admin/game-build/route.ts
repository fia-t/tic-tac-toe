import { NextResponse } from "next/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Кнопка "Зібрати гру" в адмінці. Сам білд іде в GitHub Actions
// (.github/workflows/build-game.yml) - serverless-функція Vercel не підходить
// для Vite-збірки. Тут лише перевіряємо, що запит від адміна, і запускаємо workflow.
//
// Env (Vercel -> Settings -> Environment Variables, не NEXT_PUBLIC - лише сервер):
//   GITHUB_BUILD_TOKEN - fine-grained PAT з доступом "Actions: Read and write" до репо
//   GITHUB_BUILD_REPO  - "owner/repo", за замовчуванням fia-t/tic-tac-toe
//   GITHUB_BUILD_REF   - гілка, з якої збирати, за замовчуванням main
export const runtime = "nodejs";

const WORKFLOW_FILE = "build-game.yml";
const BUILD_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// verifyIdToken потребує лише projectId (публічні ключі Google тягне сам) -
// service account на Vercel для цього не потрібен.
const getAdminAuth = () => {
    const app = getApps()[0] ?? initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
    return getAuth(app);
};

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
    const idToken = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
    if (!idToken) return fail(401, "Немає токена авторизації.");

    try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        // Той самий custom claim, що перевіряють firestore.rules/storage.rules.
        if (decoded.admin !== true) return fail(403, "Немає прав адміністратора.");
    } catch {
        return fail(401, "Недійсний токен авторизації.");
    }

    const body = (await request.json().catch(() => null)) as { buildId?: unknown } | null;
    const buildId = typeof body?.buildId === "string" ? body.buildId : "";
    if (!BUILD_ID_PATTERN.test(buildId)) return fail(400, "Некоректний buildId.");

    const token = process.env.GITHUB_BUILD_TOKEN;
    if (!token) return fail(500, "На сервері не задано GITHUB_BUILD_TOKEN.");
    const repo = process.env.GITHUB_BUILD_REPO || "fia-t/tic-tac-toe";
    const ref = process.env.GITHUB_BUILD_REF || "main";

    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`, {
        method: "POST",
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref, inputs: { build_id: buildId, target: "portal" } }),
    });

    if (!res.ok) {
        const details = await res.text().catch(() => "");
        console.error("[game-build] workflow dispatch failed", res.status, details);
        return fail(502, `GitHub не прийняв запуск збірки (HTTP ${res.status}).`);
    }

    return NextResponse.json({ ok: true });
}
