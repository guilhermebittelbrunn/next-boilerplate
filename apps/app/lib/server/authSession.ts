import { redirect } from "next/navigation";
import { cache } from "react";
import { getServerApiClient } from "./apiServerClient";

export type AppSessionUser = Record<string, unknown> & {
    uid: string;
    type?: "admin" | "common";
};

/**
 * Current user from the API `/auth/me` using the httpOnly Firebase ID token cookie,
 * resolved through the SDK (`authApi.me`). Deduplicated per request when used from
 * layouts (e.g. session + admin).
 */
export const getAppSessionUser = cache(
    async (): Promise<AppSessionUser | null> => {
        const client = await getServerApiClient();
        if (!client) {
            return null;
        }

        try {
            const me = await client.authApi.me();
            if (typeof me.uid !== "string") {
                return null;
            }
            return me as AppSessionUser;
        } catch {
            return null;
        }
    }
);

export async function requireSession(locale: string): Promise<AppSessionUser> {
    const user = await getAppSessionUser();
    if (!user) {
        redirect(`/${locale}/sign-in`);
    }
    return user;
}
