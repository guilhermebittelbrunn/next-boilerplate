import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { resolveApiCredential } from "@/(shared)/lib/resolve-api-actor";
import { sessionRepository } from "@/(shared)/repositories/session.repository";

const NO_CONTENT = 204;

/**
 * No panel guard: the session belongs to the credential, so an admin signing out while
 * impersonating ends their own session, and no context header decides whose it is.
 */
export async function GET(req: NextRequest) {
    const credential = await resolveApiCredential(req);

    if (credential.status === "revoked") {
        return Response.json(
            { error: { code: "AUTH_SESSION_REVOKED" } },
            { status: HTTP_STATUS.UNAUTHORIZED }
        );
    }
    if (credential.status === "anonymous") {
        return Response.json(
            { error: { code: "AUTH_INVALID_TOKEN" } },
            { status: HTTP_STATUS.UNAUTHORIZED }
        );
    }

    return Response.json({ data: { active: true } });
}

/** Signing out is idempotent: an ended or missing session answers the same. */
export async function DELETE(req: NextRequest) {
    const credential = await resolveApiCredential(req);

    if (credential.status === "active" && credential.sessionKey) {
        await sessionRepository.revoke(
            credential.user.uid,
            credential.sessionKey,
            "signed-out",
            new Date()
        );
    }

    return new Response(null, { status: NO_CONTENT });
}
