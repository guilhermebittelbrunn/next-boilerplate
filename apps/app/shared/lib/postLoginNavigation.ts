"use client";

import { UserType } from "@repo/sdk/src/types";
import { postAuthRedirectTarget } from "./authRedirect";

/**
 * When there is no `redirect` query, admins default to `/{locale}/admin` so the first screen matches the panel toggle.
 */
export async function resolveDefaultPostLoginForApp(args: {
    idToken: string;
    locale: string;
}): Promise<string | null> {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!base) {
        return null;
    }

    const response = await fetch(`${base}/auth/me`, {
        headers: { Authorization: `Bearer ${args.idToken}` },
    });

    if (!response.ok) {
        return null;
    }

    const payload = (await response.json()) as { data?: { type?: string } };
    const type = payload?.data?.type;

    if (type === UserType.ADMIN) {
        return `/${args.locale}/admin`;
    }

    return null;
}

export async function resolveAppPostLoginPath(args: {
    idToken: string;
    locale: string;
    fallbackPath: string;
}): Promise<string> {
    if (typeof window === "undefined") {
        return args.fallbackPath;
    }
    const raw = new URLSearchParams(window.location.search).get("redirect");
    if (raw) {
        return postAuthRedirectTarget(raw, args.fallbackPath);
    }
    return (
        (await resolveDefaultPostLoginForApp({
            idToken: args.idToken,
            locale: args.locale,
        })) ?? args.fallbackPath
    );
}
