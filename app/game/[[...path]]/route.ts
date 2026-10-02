// "Відкрити гру" в адмінці: віддає останній успішний білд standalone-гри (game/)
// рівно таким, яким він лежить у ZIP для порталу, - з Firebase Storage
// (game-builds/<buildId>/site/**, див. game/scripts/build-publish.mjs).
// Відкривати як /game/index.html: білд посилається на ./assets/... відносно себе.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const POINTER_TTL_MS = 15_000;

const objectUrl = (objectPath: string) =>
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media`;

// current.json перемикається лише в кінці успішного білда - коротко кешуємо його
// в пам'яті інстансу, щоб кожен asset-запит не тягнув ще й вказівник.
let pointerCache: { sitePrefix: string; expiresAt: number } | null = null;

const getSitePrefix = async (): Promise<string | null> => {
    if (pointerCache && pointerCache.expiresAt > Date.now()) return pointerCache.sitePrefix;
    const res = await fetch(objectUrl("game-builds/current.json"), { cache: "no-store" });
    if (!res.ok) return null;
    const { sitePrefix } = (await res.json()) as { sitePrefix?: string };
    if (!sitePrefix) return null;
    pointerCache = { sitePrefix, expiresAt: Date.now() + POINTER_TTL_MS };
    return sitePrefix;
};

export async function GET(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
    const { path = [] } = await params;
    if (path.length === 0) return Response.redirect(new URL("/game/index.html", request.url), 307);
    if (!BUCKET || path.some((segment) => segment === ".." || segment === ".")) {
        return new Response("Not found", { status: 404 });
    }

    const sitePrefix = await getSitePrefix();
    if (!sitePrefix) return new Response("Гру ще не зібрано - натисніть «Зібрати гру» в адмінці.", { status: 404 });

    const upstream = await fetch(objectUrl(`${sitePrefix}/${path.join("/")}`), { cache: "no-store" });
    if (!upstream.ok) return new Response("Not found", { status: 404 });

    return new Response(upstream.body, {
        headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
            "Cache-Control": upstream.headers.get("cache-control") ?? "no-cache",
        },
    });
}
