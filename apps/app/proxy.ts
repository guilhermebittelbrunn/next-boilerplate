import { postAuthRedirectTarget } from "@repo/auth/redirect";
import { getUserFromSessionCookie } from "@repo/auth/server";
import { getDefaultLocale, locales } from "@repo/internationalization/utils";
import { secure } from "@repo/security";
import {
    applySecurityHeaders,
    buildBrowserAppOptions,
} from "@repo/security/middleware";
import { handleClientError } from "@repo/shared/utils";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

const IDENTITY_TOOLKIT_ORIGIN = "https://identitytoolkit.googleapis.com";
/** Refreshes the ID token roughly hourly; blocking it kills the session long after sign-in. */
const SECURE_TOKEN_ORIGIN = "https://securetoken.googleapis.com";
const GOOGLE_AVATAR_ORIGIN = "https://lh3.googleusercontent.com";
const TAG_MANAGER_ORIGIN = "https://www.googletagmanager.com";
const GOOGLE_ANALYTICS_ORIGINS = [
    TAG_MANAGER_ORIGIN,
    "https://www.google-analytics.com",
    "https://region1.google-analytics.com",
];
/** Vercel Analytics only loads from this host while developing; in production it is served same-origin. */
const VERCEL_SCRIPTS_ORIGIN = "https://va.vercel-scripts.com";

const isDevelopment = process.env.NODE_ENV === "development";
const isAnalyticsEnabled = Boolean(
    env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.startsWith("G-")
);
const firebaseAuthOrigin = env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    ? `https://${env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}`
    : null;

const securityOptions = buildBrowserAppOptions({
    scriptSrc: [
        ...(isAnalyticsEnabled ? [TAG_MANAGER_ORIGIN] : []),
        ...(isDevelopment ? [VERCEL_SCRIPTS_ORIGIN] : []),
    ],
    connectSrc: [
        env.NEXT_PUBLIC_API_URL ?? "",
        IDENTITY_TOOLKIT_ORIGIN,
        SECURE_TOKEN_ORIGIN,
        ...(isAnalyticsEnabled ? GOOGLE_ANALYTICS_ORIGINS : []),
    ],
    imgSrc: [
        GOOGLE_AVATAR_ORIGIN,
        ...(isAnalyticsEnabled ? [TAG_MANAGER_ORIGIN] : []),
    ],
    frameSrc: firebaseAuthOrigin ? [firebaseAuthOrigin] : [],
});

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
    return applySecurityHeaders(await route(request), securityOptions);
}

async function route(request: NextRequest) {
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
