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

    return async (request: NextRequest) => {
        const isProtectedRoute = protectedRoutes.some((route) =>
            request.nextUrl.pathname.startsWith(route)
        );

        if (!isProtectedRoute) {
            const next =
                typeof nextMiddleware === "function"
                    ? nextMiddleware.length === 0
                        ? (nextMiddleware as () => NextMiddleware)()
                        : (nextMiddleware as NextMiddleware)
                    : nextMiddleware;
            return next ? next(request) : NextResponse.next();
        }

        const token =
            request.cookies.get("firebase-token")?.value ||
            request.headers.get("authorization")?.replace("Bearer ", "");

        try {
            const user = await getCurrentUser(token || null);

            if (!user) {
                const url = new URL(redirectTo, request.url);
                url.searchParams.set("redirect", request.nextUrl.pathname);
                return NextResponse.redirect(url);
            }

            const requestHeaders = new Headers(request.headers);
            requestHeaders.set("x-user-id", user.uid);
            requestHeaders.set("x-user-email", user.email ?? "");

            const next =
                typeof nextMiddleware === "function"
                    ? nextMiddleware.length === 0
                        ? (nextMiddleware as () => NextMiddleware)()
                        : (nextMiddleware as NextMiddleware)
                    : nextMiddleware;
            if (next) {
                return next(request);
            }

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
                const next =
                    typeof nextMiddleware === "function"
                        ? nextMiddleware.length === 0
                            ? (nextMiddleware as () => NextMiddleware)()
                            : (nextMiddleware as NextMiddleware)
                        : nextMiddleware;
                return next ? next(request) : NextResponse.next();
            }
            const url = new URL(redirectTo, request.url);
            url.searchParams.set("redirect", request.nextUrl.pathname);
            return NextResponse.redirect(url);
        }
    };
}
