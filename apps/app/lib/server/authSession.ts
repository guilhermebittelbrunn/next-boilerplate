import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

const ACCESS_TOKEN_COOKIE = "access-token";

function stripTrailingSlash(value: string): string {
    return value.endsWith("/") ? value.slice(0, -1) : value;
}

function apiBaseUrl(): string | null {
    const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (!raw) {
        return null;
    }
    return stripTrailingSlash(raw);
}

export type AppSessionUser = Record<string, unknown> & {
    uid: string;
    type?: "admin" | "common";
};

/**
 * Current user from the API `/auth/me` using the httpOnly Firebase ID token cookie.
 * Deduplicated per request when used from layouts (e.g. session + admin).
 */
export const getAppSessionUser = cache(
    async (): Promise<AppSessionUser | null> => {
        const cookieStore = await cookies();
        const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
        if (!token) {
            return null;
        }

        const base = apiBaseUrl();
        if (!base) {
            return null;
        }

        const res = await fetch(`${base}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        });

        if (!res.ok) {
            return null;
        }

        let json: unknown;
        try {
            json = await res.json();
        } catch {
            return null;
        }

        if (!json || typeof json !== "object") {
            return null;
        }
        const payload = json as { data?: unknown };
        const data = payload.data;
        if (!data || typeof data !== "object") {
            return null;
        }
        const user = data as Record<string, unknown>;
        if (typeof user.uid !== "string") {
            return null;
        }

        return user as AppSessionUser;
    }
);

export async function requireSession(locale: string): Promise<AppSessionUser> {
    const user = await getAppSessionUser();
    if (!user) {
        redirect(`/${locale}/sign-in`);
    }
    return user;
}
