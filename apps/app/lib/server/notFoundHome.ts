import { getAppSessionUser } from "@/lib/server/authSession";
import { withLocalePath } from "@/shared/lib/localePath";

/**
 * Home link for 404: locale-prefixed `/` for guests and common users, `/admin` for admins.
 */
export async function resolveNotFoundHomePath(locale: string): Promise<string> {
    const user = await getAppSessionUser();
    const path = user?.type === "admin" ? "/admin" : "/";
    return withLocalePath(locale, path);
}
