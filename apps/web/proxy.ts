"use server";

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

const firebaseAuthOrigin = env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    ? `https://${env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}`
    : null;

const securityOptions = buildBrowserAppOptions({
    connectSrc: [
        env.NEXT_PUBLIC_API_URL ?? "",
        IDENTITY_TOOLKIT_ORIGIN,
        SECURE_TOKEN_ORIGIN,
    ],
    frameSrc: firebaseAuthOrigin ? [firebaseAuthOrigin] : [],
});

/**
 * The landing carries whatever marketing scripts a fork bolts on, and the cost of a
 * wrong policy here is a blank page for anonymous visitors. Reporting first surfaces
 * the real origins in the console without taking the site down while they are found.
 */
const REPORT_ONLY = true;

export const config = {
    // matcher tells Next.js which routes to run the proxy on. This runs on all
    // routes except for static assets and API routes. Proxy always runs on Node.
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|api|robots.txt|sitemap.xml).*)",
    ],
};

// Custom middleware for Arcjet security checks
const arcjetMiddleware = async (request: NextRequest) => {
    if (!env.ARCJET_KEY) {
        return;
    }

    try {
        await secure(
            [
                // See https://docs.arcjet.com/bot-protection/identifying-bots
                "CATEGORY:SEARCH_ENGINE", // Allow search engines
                "CATEGORY:PREVIEW", // Allow preview links to show OG images
                "CATEGORY:MONITOR", // Allow uptime monitoring services
            ],
            request
        );
    } catch (error) {
        const message = handleClientError(error);
        return NextResponse.json({ error: message }, { status: 403 });
    }
};

export default async function proxy(request: NextRequest) {
    return applySecurityHeaders(
        await route(request),
        securityOptions,
        REPORT_ONLY
    );
}

async function route(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const cookieStore = await cookies();

    const defaultLocale = getDefaultLocale();

    const currentLocale = pathname.split("/")[1];

    // If pathname doesn't have a locale, redirect to default locale
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

    // TODO: Add Firebase Auth middleware here
    // Example:
    // const token = await getFirebaseToken(request);
    // if (!token && isProtectedRoute(request)) {
    //   return NextResponse.redirect(new URL("/sign-in", request.url));
    // }

    const arcjetResponse = await arcjetMiddleware(request);

    if (arcjetResponse) {
        return arcjetResponse;
    }

    return NextResponse.next();
}
