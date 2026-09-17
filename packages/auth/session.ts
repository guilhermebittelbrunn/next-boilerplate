import "server-only";
import { cookies } from "next/headers";
import { createSessionCookie, verifyIdTokenClaims } from "./server";

/**
 * Cross-app session cookie: a Firebase **session cookie** (not a raw ID token),
 * shared between front-ends. Generic on purpose — apps mount thin routes over it.
 *
 * Dev: omit `Domain` → host-only `localhost` cookie, already shared across ports
 * (browsers ignore the port for cookie scope). Prod: set `SESSION_COOKIE_DOMAIN`
 * to the registrable parent (e.g. `example.com`) so `app.example.com` + `example.com`
 * share it. Never a public suffix (`*.vercel.app` is rejected by browsers).
 */
export const SESSION_COOKIE_NAME = "access-token";

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MS_PER_DAY =
    HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;
const MIN_EXPIRES_MINUTES = 5; // Firebase minimum (5 min)
const MAX_EXPIRES_DAYS = 14; // Firebase maximum (2 weeks)
const DEFAULT_MAX_AGE_DAYS = 5;
const MIN_EXPIRES_MS = MIN_EXPIRES_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND;
const MAX_EXPIRES_MS = MAX_EXPIRES_DAYS * MS_PER_DAY;

const DEFAULT_ABSOLUTE_MAX_AGE_DAYS = 30;
const MAX_ABSOLUTE_MAX_AGE_DAYS = 90;
const REFRESH_AFTER_FRACTION = 0.5;

/**
 * Custom claim carrying the instant of the original authentication across the
 * cross-app SSO bootstrap. `signInWithCustomToken` is a fresh authentication and
 * rewrites `auth_time`, so without it opening the second front-end would restart
 * the absolute lifetime of the session.
 */
export const SESSION_ORIGIN_CLAIM = "sessionAuthTime";

/** Session lifetime in ms, from `SESSION_COOKIE_MAX_AGE_DAYS`, clamped to Firebase bounds. */
function getSessionExpiresMs(): number {
    const days = Number(process.env.SESSION_COOKIE_MAX_AGE_DAYS);
    const requested =
        Number.isFinite(days) && days > 0
            ? days * MS_PER_DAY
            : DEFAULT_MAX_AGE_DAYS * MS_PER_DAY;
    return Math.min(Math.max(requested, MIN_EXPIRES_MS), MAX_EXPIRES_MS);
}

type SessionCookieOptions = {
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: "/";
    maxAge: number;
    domain?: string;
};

/** Cookie attributes shared by set + clear so the cookie can be cleared cross-domain. */
function getSessionCookieOptions(maxAgeSeconds: number): SessionCookieOptions {
    const domain = process.env.SESSION_COOKIE_DOMAIN?.trim();
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: maxAgeSeconds,
        // Omit in dev (host-only localhost cookie, shared across ports).
        ...(domain ? { domain } : {}),
    };
}

/**
 * Lightweight CSRF guard for the cookie-minting POST: reject when a cross-origin
 * `Origin` is present and does not match the request host. Same-origin POSTs
 * (the only legitimate callers) pass. Complements `SameSite=Lax`.
 */
export function isSameOriginRequest(request: Request): boolean {
    const origin = request.headers.get("origin");
    if (!origin) {
        return true; // non-CORS request (e.g. same-origin form/server) — allowed
    }
    const host = request.headers.get("host");
    try {
        return new URL(origin).host === host;
    } catch {
        return false;
    }
}

/**
 * Absolute session lifetime in ms, from `SESSION_ABSOLUTE_MAX_AGE_DAYS`. The floor is
 * the cookie lifetime: a cap shorter than it would only produce valid cookies that the
 * very next renewal refuses.
 */
export function getSessionAbsoluteMaxAgeMs(): number {
    // `||` and not `??`: `.env.example` ships the variable as `""`, and emptying it is
    // how a fork opts out — an empty string must read as absent, not as `0`.
    const days = Number(process.env.SESSION_ABSOLUTE_MAX_AGE_DAYS || undefined);
    const requested =
        Number.isFinite(days) && days > 0
            ? days * MS_PER_DAY
            : DEFAULT_ABSOLUTE_MAX_AGE_DAYS * MS_PER_DAY;
    return Math.min(
        Math.max(requested, getSessionExpiresMs()),
        MAX_ABSOLUTE_MAX_AGE_DAYS * MS_PER_DAY
    );
}

/** Instant of the authentication that originated the session, in seconds. */
export function resolveSessionOriginSeconds(
    claims: Record<string, unknown>
): number | null {
    const carried = claims[SESSION_ORIGIN_CLAIM];
    if (typeof carried === "number" && Number.isFinite(carried)) {
        return carried;
    }
    const authTime = claims.auth_time;
    return typeof authTime === "number" && Number.isFinite(authTime)
        ? authTime
        : null;
}

export function isWithinAbsoluteCap(originSeconds: number | null): boolean {
    if (originSeconds === null) {
        // With no readable origin the cookie expiry still governs; refusing here would
        // invent a sign-out nobody asked for.
        return true;
    }
    return (
        Date.now() - originSeconds * MS_PER_SECOND <
        getSessionAbsoluteMaxAgeMs()
    );
}

/** Rewriting the cookie before the threshold costs a provider call for no extra life. */
export function shouldRefreshSession(issuedAtSeconds: number): boolean {
    const age = Date.now() - issuedAtSeconds * MS_PER_SECOND;
    return age >= getSessionExpiresMs() * REFRESH_AFTER_FRACTION;
}

export type MintSessionResult =
    | { ok: true }
    | { ok: false; reason: "invalid-token" | "absolute-cap" };

/** Verify the ID token → mint a session cookie → set it with the shared attributes. */
export async function mintSessionCookie(
    idToken: string
): Promise<MintSessionResult> {
    const claims = await verifyIdTokenClaims(idToken);
    if (!claims) {
        return { ok: false, reason: "invalid-token" };
    }
    if (!isWithinAbsoluteCap(resolveSessionOriginSeconds(claims))) {
        return { ok: false, reason: "absolute-cap" };
    }

    const expiresMs = getSessionExpiresMs();
    let sessionCookie: string;
    try {
        sessionCookie = await createSessionCookie(idToken, expiresMs);
    } catch {
        return { ok: false, reason: "invalid-token" };
    }

    const cookieStore = await cookies();
    cookieStore.set(
        SESSION_COOKIE_NAME,
        sessionCookie,
        getSessionCookieOptions(Math.floor(expiresMs / MS_PER_SECOND))
    );
    return { ok: true };
}

/** Read the raw session cookie value (server-side). */
export async function readSessionCookie(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/** Clear the session cookie using matching attributes (so a `Domain` cookie is removed). */
export async function clearSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "", getSessionCookieOptions(0));
}
