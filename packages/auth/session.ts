import "server-only";
import { cookies } from "next/headers";
import { createSessionCookie } from "./server";

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

/** Verify the ID token → mint a session cookie → set it with the shared attributes. */
export async function mintSessionCookie(idToken: string): Promise<void> {
    const expiresMs = getSessionExpiresMs();
    const sessionCookie = await createSessionCookie(idToken, expiresMs);
    const cookieStore = await cookies();
    cookieStore.set(
        SESSION_COOKIE_NAME,
        sessionCookie,
        getSessionCookieOptions(Math.floor(expiresMs / MS_PER_SECOND))
    );
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
