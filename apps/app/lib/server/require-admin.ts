import { redirect } from "next/navigation";
import type { AppSessionUser } from "@/lib/server/auth-session";
import { getAppSessionUser } from "@/lib/server/auth-session";

export type { AppSessionUser } from "@/lib/server/auth-session";

/**
 * Requires a valid session and Firestore `type === "admin"`.
 * Common users are sent to the locale home (`/`).
 */
export async function requireAdmin(locale: string): Promise<AppSessionUser> {
    const user = await getAppSessionUser();

    if (!user) {
        redirect(`/${locale}/sign-in`);
    }
    if (user.type !== "admin") {
        redirect(`/${locale}`);
    }
    return user;
}
