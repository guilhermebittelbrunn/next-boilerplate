import { postAuthRedirectTarget } from "@repo/auth/redirect";

/** Only a destination that passes the open-redirect guard is carried to the other form. */
export function withRedirectQuery(
    path: string,
    rawRedirect: string | null | undefined
): string {
    const target = postAuthRedirectTarget(rawRedirect ?? null, "");
    return target ? `${path}?redirect=${encodeURIComponent(target)}` : path;
}
