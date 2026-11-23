import {
    checkRateLimit,
    type RateLimitBlockReason,
    type RateLimitBudget,
} from "@repo/security";
import {
    applySecurityHeaders,
    buildApiOptions,
} from "@repo/security/middleware";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import {
    generateRequestId,
    REQUEST_ID_HEADER,
} from "@repo/shared/utils/helpers/request-id";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
    buildCorsHeaders,
    isOriginAllowed,
    resolveAllowedOrigins,
} from "@/(shared)/lib/cors";
import { rateLimitSubject } from "@/(shared)/lib/rate-limit-subject";
import { env } from "@/env";

const NO_CONTENT = 204;

const allowedOrigins = resolveAllowedOrigins(
    env.CORS_ORIGIN,
    process.env.NODE_ENV === "production"
);

const securityOptions = buildApiOptions();

/**
 * Two budgets. Every POST/PUT/PATCH/DELETE counts in the standard one (60 a minute per
 * address and actor), so a new mutating endpoint is limited without being listed here.
 * The paths below count in the strict one instead (20 a minute per address), never in
 * both: each spends the project's Identity Toolkit quota, sends mail, writes billed
 * storage or charges money on the fork's account.
 *
 * Account entry and recovery endpoints have no guard to hang a budget on. `/auth/me` is
 * authenticated and on the hot path, so it stays off: GETs only count when listed here.
 * The GET on `/auth/sign-in/email-link` stays off for the same reason: every visit to the
 * sign-in screen reads it, and it only describes the configuration.
 *
 * `/files` is the exception that is authenticated: a guard is no budget when the caller
 * is a legitimate user in a loop, and every accepted request writes to the fork's bucket
 * and is billed as storage and egress. The two data-rights endpoints are the same kind of
 * exception: the export reads the whole dossier on every call, and the deletion spends
 * Identity Toolkit quota on each password attempt. The email change request spends it
 * too, and sends two emails on top. Changing or setting the password spends it as well,
 * and the payment endpoints open a session on the provider for each call.
 *
 * `/payments/catalog` stays off the list on purpose: the landing's server asks for it on
 * behalf of every visitor, from one address, so a per-address budget would throttle the
 * page itself. Its cache already keeps the provider out of the request path.
 *
 * `/contact` is public and every accepted request sends an email to the fork's support
 * inbox, billed by the provider. The visitor's browser calls it, so the address counted
 * is the visitor's.
 *
 * Organization invitations: `/organization/invitations` sends an email on every accepted
 * POST and counts only the POST, since the owner's table reads it after every change.
 * `/invitations/preview` is public and answers whether a token is live, `/invitations/accept`
 * consumes one. The pending ceiling and the resend interval still hold without a budget.
 *
 * Matched exactly: a neighbour of a listed path falls back to the standard budget.
 */
const STRICT_RATE_LIMITED_PATHS = [
    "/auth/sign-in",
    "/auth/sign-up",
    "/auth/sign-in/google",
    "/auth/sign-in/email-link/request",
    "/auth/password/reset-request",
    "/auth/password/reset",
    "/auth/email-verification/send",
    "/auth/email-verification/confirm",
    "/auth/email-change/confirm",
    "/files",
    "/account/export",
    "/account/deletion",
    "/account/email",
    "/account/password",
    "/account/password/set",
    "/contact",
    "/organization/invitations",
    "/invitations/preview",
    "/invitations/accept",
    "/payments/checkout",
    "/payments/portal",
];

/** Listed paths that count only these methods; every other listed path counts any method. */
const STRICT_RATE_LIMITED_METHODS = new Map<string, readonly string[]>([
    ["/organization/invitations", ["POST"]],
]);

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Stripe retries from a handful of addresses; a 429 here is a lost event. */
const RATE_LIMIT_EXEMPT_PATHS = ["/webhooks/payments"];

function rateLimitBudgetFor(request: NextRequest): RateLimitBudget | null {
    const { pathname } = request.nextUrl;
    if (STRICT_RATE_LIMITED_PATHS.includes(pathname)) {
        const methods = STRICT_RATE_LIMITED_METHODS.get(pathname);
        if (methods === undefined || methods.includes(request.method)) {
            return "strict";
        }
    }
    if (RATE_LIMIT_EXEMPT_PATHS.includes(pathname)) {
        return null;
    }
    return MUTATING_METHODS.has(request.method) ? "standard" : null;
}

/** Single line, stable prefix, no address, header or body: blocking is not a reason to start retaining personal data. */
function logBlocked(
    reason: RateLimitBlockReason | "origin",
    request: NextRequest,
    requestId: string
): void {
    logEvent("security", "blocked", {
        reason,
        path: request.nextUrl.pathname,
        method: request.method,
        requestId,
    });
}

function withRequestId<T extends Response>(response: T, requestId: string): T {
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
}

function withSecurityHeaders<T extends Response>(response: T): T {
    return applySecurityHeaders(response, securityOptions, { noIndex: true });
}

function withCors<T extends Response>(response: T, origin: string | null): T {
    for (const [name, value] of Object.entries(buildCorsHeaders(origin))) {
        response.headers.set(name, value);
    }
    return response;
}

function refuseOrigin(request: NextRequest, requestId: string): NextResponse {
    logBlocked("origin", request, requestId);

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
    // Always generated here, never read from the caller: honouring an inbound value
    // would let a client forge log lines under an identifier of its choosing.
    const requestId = generateRequestId();
    const origin = request.headers.get("origin");

    if (!isOriginAllowed(origin, allowedOrigins)) {
        return withRequestId(
            withSecurityHeaders(
                withCors(refuseOrigin(request, requestId), null)
            ),
            requestId
        );
    }

    if (request.method === "OPTIONS") {
        return withRequestId(
            withSecurityHeaders(
                withCors(new NextResponse(null, { status: NO_CONTENT }), origin)
            ),
            requestId
        );
    }

    const budget = rateLimitBudgetFor(request);
    if (budget) {
        const decision = await checkRateLimit(request, {
            budget,
            subject:
                budget === "standard"
                    ? await rateLimitSubject(request)
                    : undefined,
        });

        if (!decision.allowed) {
            logBlocked(decision.reason, request, requestId);
            return withRequestId(
                withSecurityHeaders(
                    withCors(
                        refuseRateLimit(decision.retryAfterSeconds),
                        origin
                    )
                ),
                requestId
            );
        }
    }

    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set(REQUEST_ID_HEADER, requestId);

    return withRequestId(
        withSecurityHeaders(
            withCors(
                NextResponse.next({ request: { headers: forwardedHeaders } }),
                origin
            )
        ),
        requestId
    );
}

export const config = {
    matcher: "/:path*",
};
