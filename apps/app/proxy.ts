import { getCurrentUser } from "@repo/auth/server";
import { getDefaultLocale, locales } from "@repo/internationalization/utils";
import { secure } from "@repo/security";
import { handleClientError } from "@repo/shared/utils";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export const config = {
    // matcher tells Next.js which routes to run the proxy on. This runs on all
    // routes except for static assets and API routes. Proxy always runs on Node.
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};

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

function isAuthenticatedAreaPath(path: string): boolean {
    return path === "/" || path.startsWith("/admin");
}

export default async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

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

    const enforceAuth = isAuthenticatedAreaPath(appPath);

    if (enforceAuth) {
        const token = request.cookies.get("access-token")?.value ?? null;
        const user = await getCurrentUser(token);

        if (!user) {
            const url = request.nextUrl.clone();
            url.pathname = `/${currentLocale}/sign-in`;
            url.searchParams.set("redirect", pathname);
            return NextResponse.redirect(url);
        }
    }

    const arcjetResponse = await arcjetMiddleware(request);

    if (arcjetResponse) {
        return arcjetResponse;
    }

    return NextResponse.next();
}
