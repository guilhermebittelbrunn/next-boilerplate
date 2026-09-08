import { checkRateLimit, type RateLimitBlockReason } from "@repo/security";
import {
    applySecurityHeaders,
    buildApiOptions,
} from "@repo/security/middleware";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
    buildCorsHeaders,
    isOriginAllowed,
    resolveAllowedOrigins,
} from "@/(shared)/lib/cors";
import { env } from "@/env";

const NO_CONTENT = 204;

const allowedOrigins = resolveAllowedOrigins(
    env.CORS_ORIGIN,
    process.env.NODE_ENV === "production"
);

const securityOptions = buildApiOptions();

/**
 * Public authentication endpoints: no guard to hang a budget on, and each one
 * spends the project's Identity Toolkit quota. `/auth/me` is authenticated and on
 * the hot path, `/webhooks/payments` is retried aggressively by Stripe — throttling
 * either costs more than it protects.
 */
const RATE_LIMITED_PATHS = [
    "/auth/sign-in",
    "/auth/sign-up",
    "/auth/sign-in/google",
];

function isRateLimitedPath(pathname: string): boolean {
    return RATE_LIMITED_PATHS.includes(pathname);
}

/** Single line, stable prefix, no address, header or body: blocking is not a reason to start retaining personal data. */
function logBlocked(
    reason: RateLimitBlockReason | "origin",
    request: NextRequest
): void {
    console.warn(
        `[security] blocked reason=${reason} path=${request.nextUrl.pathname} method=${request.method}`
    );
}

function withSecurityHeaders<T extends Response>(response: T): T {
    return applySecurityHeaders(response, securityOptions);
}

function withCors<T extends Response>(response: T, origin: string | null): T {
    for (const [name, value] of Object.entries(buildCorsHeaders(origin))) {
        response.headers.set(name, value);
    }
    return response;
}

function refuseOrigin(request: NextRequest): NextResponse {
    logBlocked("origin", request);

    // A preflight has no body the browser would read; withholding
    // `Access-Control-Allow-Origin` is itself the refusal.
    if (request.method === "OPTIONS") {
        return new NextResponse(null, { status: NO_CONTENT });
    }

    return NextResponse.json(
        { error: { code: "AUTH_FORBIDDEN_ORIGIN" } },
        { status: HTTP_STATUS.FORBIDDEN }
    );
}

function refuseRateLimit(retryAfterSeconds: number | null): NextResponse {
    const response = NextResponse.json(
        { error: { code: "AUTH_RATE_LIMITED" } },
        { status: HTTP_STATUS.TOO_MANY_REQUESTS }
    );

    if (retryAfterSeconds !== null) {
        response.headers.set("Retry-After", String(retryAfterSeconds));
    }

    return response;
}

export async function proxy(request: NextRequest) {
    const origin = request.headers.get("origin");

    if (!isOriginAllowed(origin, allowedOrigins)) {
        return withSecurityHeaders(withCors(refuseOrigin(request), null));
    }

    if (request.method === "OPTIONS") {
        return withSecurityHeaders(
            withCors(new NextResponse(null, { status: NO_CONTENT }), origin)
        );
    }

    if (isRateLimitedPath(request.nextUrl.pathname)) {
        const decision = await checkRateLimit(request);

        if (!decision.allowed) {
            logBlocked(decision.reason, request);
            return withSecurityHeaders(
                withCors(refuseRateLimit(decision.retryAfterSeconds), origin)
            );
        }
    }

    return withSecurityHeaders(withCors(NextResponse.next(), origin));
}

export const config = {
    matcher: "/:path*",
};
