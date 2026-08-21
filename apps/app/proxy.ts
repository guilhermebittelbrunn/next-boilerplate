import { postAuthRedirectTarget } from "@repo/auth/redirect";
import { getUserFromSessionCookie } from "@repo/auth/server";
import { getDefaultLocale, locales } from "@repo/internationalization/utils";
import { secure } from "@repo/security";
import { handleClientError } from "@repo/shared/utils";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

/**
 * The only paths that do not require a session. Everything else is default-deny, so a
 * new authenticated route is protected the moment it exists — no allowlist to remember.
 * An authenticated visitor on one of these is bounced to their home.
 */
export const PUBLIC_PATHS = ["/sign-in", "/sign-up"] as const;

function isPublicPath(path: string): boolean {
    return PUBLIC_PATHS.some(
        (publicPath) => path === publicPath || path.startsWith(`${publicPath}/`)
    );
}

export const config = {
    // matcher tells Next.js which routes to run the proxy on. This runs on all
    // routes except for static assets and API routes. Proxy always runs on Node.
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};

const FILE_EXTENSION = /\.[a-zA-Z0-9]+$/;

/**
 * A path ending in a file extension is a static asset — typically something dropped in
 * `public/`. The proxy is default-deny, so without this it would redirect anonymous
 * visitors to sign-in instead of serving the file. Checked here rather than in `matcher`
 * because Next compiles matchers with path-to-regexp, where an anchored lookahead does
 * not behave like plain regex.
 */
function isStaticAssetPath(pathname: string): boolean {
    return FILE_EXTENSION.test(pathname);
}

const arcjetMiddleware = async (request: NextRequest) => {
    if (!env.ARCJET_KEY) {
        return;
    }

    try {
        await secure(
            ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW", "CATEGORY:MONITOR"],
            request
        );
    } catch (error) {
        const message = handleClientError(error);
        return NextResponse.json({ error: message }, { status: 403 });
    }
};

function pathWithoutLocale(pathname: string, locale: string): string {
    const stripped = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "");
    return stripped === "" ? "/" : stripped;
}

export default async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (isStaticAssetPath(pathname)) {
        return NextResponse.next();
    }

    const cookieStore = await cookies();

    const defaultLocale = getDefaultLocale();

    const currentLocale = pathname.split("/")[1];

    if (
        !(
            currentLocale &&
            locales.includes(currentLocale as "pt-br" | "en" | "es")
        )
    ) {
        const newUrl = new URL(`/${defaultLocale}${pathname}`, request.url);
        cookieStore.set("x-locale", defaultLocale);
        return NextResponse.redirect(newUrl);
    }

    cookieStore.set("x-locale", currentLocale);

    const appPath = pathWithoutLocale(pathname, currentLocale);
    const isPublic = isPublicPath(appPath);
    const token = request.cookies.get("access-token")?.value ?? null;

    // One session lookup serves both branches below.
    const sessionUser = token ? await getUserFromSessionCookie(token) : null;

    if (!(isPublic || sessionUser)) {
        const url = request.nextUrl.clone();
        url.pathname = `/${currentLocale}/sign-in`;
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
    }

    if (isPublic && sessionUser) {
        // Honour the deep link the unauthenticated redirect stored, so returning through
        // sign-in lands where the visitor was going. The role lives in Firestore, not in
        // the session cookie, so resolving admin vs common here would cost an API call on
        // the hot path: fall back to the common home and let `(common)/layout.tsx` forward
        // admins to /admin — one server-side hop, no visible flash.
        const target = postAuthRedirectTarget(
            request.nextUrl.searchParams.get("redirect"),
            `/${currentLocale}`
        );
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.search = "";
        redirectUrl.pathname = target;
        return NextResponse.redirect(redirectUrl);
    }

    const arcjetResponse = await arcjetMiddleware(request);

    if (arcjetResponse) {
        return arcjetResponse;
    }

    return NextResponse.next();
}
