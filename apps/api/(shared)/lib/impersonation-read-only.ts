import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import type { ResolvedAuthRequestContext } from "@/(shared)/lib/auth-request-context";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Acting as another user is read-only, in every panel: a write made under someone else's
 * identity has no trustworthy author. Support writes belong to an admin endpoint used from
 * the admin panel, where the admin signs the change as themselves.
 *
 * Reads stay open on purpose. Seeing the user's data is the whole point of the mode, and
 * the impersonation picker itself is fed by `GET /users` — refusing reads would lock the
 * admin into the first user they switched to, with no way back.
 *
 * Despite the name it never throws: it returns the refusal, so guards keep the same
 * early-return shape they already use for the resolved context.
 */
export function assertReadOnlyWhileImpersonating(
    req: NextRequest,
    resolved: ResolvedAuthRequestContext
): Response | null {
    if (!resolved.isImpersonating || SAFE_METHODS.has(req.method)) {
        return null;
    }

    return Response.json(
        { error: { code: "AUTH_REQUEST_IMPERSONATION_READ_ONLY" } },
        { status: HTTP_STATUS.FORBIDDEN }
    );
}
