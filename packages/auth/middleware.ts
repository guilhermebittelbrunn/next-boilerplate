import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "./server";

type NextMiddleware = (
    request: NextRequest
) => NextResponse | Promise<NextResponse>;

type AuthMiddlewareOptions = {
    protectedRoutes?: string[];
    redirectTo?: string;
};

/**
 * O segundo argumento aceita tanto um middleware quanto uma factory que o
 * produz. A aridade desambigua os dois: uma função sem parâmetros é a factory,
 * uma que recebe a request já é o próprio middleware.
 */
const resolveNextMiddleware = (
    nextMiddleware?: NextMiddleware | (() => NextMiddleware)
): NextMiddleware | undefined => {
    if (typeof nextMiddleware !== "function") {
        return nextMiddleware;
    }

    if (nextMiddleware.length === 0) {
        return (nextMiddleware as () => NextMiddleware)();
    }

    return nextMiddleware as NextMiddleware;
};

/**
 * Firebase Auth middleware for Next.js (Clerk-style).
 * Verifies the Firebase ID token from cookies or Authorization header.
 * Accepts an optional next middleware to run after auth (e.g. security headers).
 */
export function authMiddleware(
    nextMiddleware?: NextMiddleware | (() => NextMiddleware),
    options?: AuthMiddlewareOptions
): NextMiddleware {
    const {
        protectedRoutes = ["/(authenticated)", "/api/collaboration"],
        redirectTo = "/sign-in",
    } = options ?? {};

    const redirectToSignIn = (request: NextRequest) => {
        const url = new URL(redirectTo, request.url);
        url.searchParams.set("redirect", request.nextUrl.pathname);
        return NextResponse.redirect(url);
    };

    const runNext = (request: NextRequest) => {
        const next = resolveNextMiddleware(nextMiddleware);
        return next ? next(request) : NextResponse.next();
    };

    return async (request: NextRequest) => {
        const isProtectedRoute = protectedRoutes.some((route) =>
            request.nextUrl.pathname.startsWith(route)
        );

        if (!isProtectedRoute) {
            return runNext(request);
        }

        const token =
            request.cookies.get("access-token")?.value ||
            request.headers.get("authorization")?.replace("Bearer ", "");

        try {
            const user = await getCurrentUser(token || null);

            if (!user) {
                return redirectToSignIn(request);
            }

            const next = resolveNextMiddleware(nextMiddleware);
            if (next) {
                return next(request);
            }

            const requestHeaders = new Headers(request.headers);
            requestHeaders.set("x-user-id", user.uid);
            requestHeaders.set("x-user-email", user.email ?? "");

            return NextResponse.next({
                request: { headers: requestHeaders },
            });
        } catch (error) {
            if (
                error instanceof Error &&
                error.message.includes("Firebase Admin credentials")
            ) {
                console.warn(
                    "Firebase Auth not configured, skipping authentication"
                );
                return runNext(request);
            }

            return redirectToSignIn(request);
        }
    };
}
