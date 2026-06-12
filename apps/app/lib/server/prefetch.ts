import { UserRoleLevel } from "@repo/auth/types";
import { cookies } from "next/headers";
import {
    IMPERSONATE_UID_COOKIE,
    PANEL_ROLE_COOKIE,
} from "@/shared/lib/authRequestHeaders";

/**
 * Whether the admin is currently impersonating a common user (COMMON panel +
 * a picked user), read from the panel cookies mirrored by the client store.
 *
 * Server prefetch only sends the Bearer token (the API resolves the user as
 * themselves), so when impersonation is active we skip prefetch and let the
 * client fetch with the impersonation headers — avoiding a wrong-user flash.
 */
export async function isImpersonating(): Promise<boolean> {
    const cookieStore = await cookies();
    const role = cookieStore.get(PANEL_ROLE_COOKIE)?.value;
    const impersonatedUid = cookieStore.get(IMPERSONATE_UID_COOKIE)?.value;
    return role === UserRoleLevel.COMMON && Boolean(impersonatedUid);
}
