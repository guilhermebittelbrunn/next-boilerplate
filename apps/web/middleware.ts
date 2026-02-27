"use server";

import { getDefaultLocale, locales } from "@repo/internationalization/utils";
import { secure } from "@repo/security";
import { handleClientError } from "@repo/shared/utils";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export const config = {
    // matcher tells Next.js which routes to run the middleware on. This runs the
    // middleware on all routes except for static assets and API routes
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
    runtime: "nodejs",
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

export default async function middleware(request: NextRequest) {
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
