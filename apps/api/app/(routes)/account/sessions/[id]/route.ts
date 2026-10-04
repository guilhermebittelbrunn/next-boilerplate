import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
import {
    type RouteIdParamsContext,
    resolveIdFromContext,
} from "@/(shared)/lib/resolve-route-id";
import { resolveRequestSessionKey } from "@/(shared)/lib/session-key";
import { sessionRepository } from "@/(shared)/repositories/session.repository";
import { parseSessionId } from "@/(shared)/validation/session.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

const NO_CONTENT = 204;

function notFound() {
    return Response.json(
        { error: { code: "ACCOUNT_SESSION_NOT_FOUND" } },
        { status: HTTP_STATUS.NOT_FOUND }
    );
}

/**
 * The document looked up is always built from the caller's own uid, so an id belonging to
 * someone else can only miss. The current session is refused: ending it from the list
 * would leave this browser's cookie and Firebase client alive on screen.
 */
export const DELETE = requireCommonPanelApi<RouteIdParamsContext>(
    async (req, ctx) => {
        const id = parseSessionId(await resolveIdFromContext(ctx));
        if (!id) {
            return notFound();
        }

        if (id === (await resolveRequestSessionKey(req))) {
            return Response.json(
                { error: { code: "ACCOUNT_SESSION_IS_CURRENT" } },
                { status: HTTP_STATUS.CONFLICT }
            );
        }

        const session = await sessionRepository.findByUidAndKey(
            ctx.user.uid,
            id
        );
        if (!session) {
            return notFound();
        }

        if (!session.revokedAt) {
            await sessionRepository.revoke(
                ctx.user.uid,
                id,
                "revoked",
                new Date()
            );

            const label = ctx.user.email ?? ctx.user.displayName ?? null;
            await recordAuditEvent({
                action: AuditAction.ACCOUNT_SESSION_REVOKE,
                actorUserId: ctx.subjectProfile.id,
                actorUid: ctx.user.uid,
                actorLabel: label,
                targetType: AuditTargetType.SESSION,
                targetUserId: ctx.subjectProfile.id,
                targetLabel: label,
                requestId: requestIdFrom(req),
            });
        }

        return new Response(null, { status: NO_CONTENT });
    }
);
