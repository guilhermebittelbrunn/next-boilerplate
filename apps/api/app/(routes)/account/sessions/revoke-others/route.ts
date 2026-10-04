import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
import { resolveRequestSessionKey } from "@/(shared)/lib/session-key";
import { sessionRepository } from "@/(shared)/repositories/session.repository";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

/** Without a session to keep, ending "the others" would end everything, current included. */
export const POST = requireCommonPanelApi(async (req, ctx) => {
    const currentKey = await resolveRequestSessionKey(req);
    if (!currentKey) {
        return Response.json(
            { error: { code: "ACCOUNT_SESSION_UNIDENTIFIED" } },
            { status: HTTP_STATUS.CONFLICT }
        );
    }

    const revoked = await sessionRepository.revokeOthers(
        ctx.user.uid,
        currentKey,
        new Date()
    );

    const label = ctx.user.email ?? ctx.user.displayName ?? null;
    await recordAuditEvent({
        action: AuditAction.ACCOUNT_SESSIONS_REVOKE_OTHERS,
        actorUserId: ctx.subjectProfile.id,
        actorUid: ctx.user.uid,
        actorLabel: label,
        targetType: AuditTargetType.SESSION,
        targetUserId: ctx.subjectProfile.id,
        targetLabel: label,
        requestId: requestIdFrom(req),
    });

    return Response.json({ data: { revoked } });
});
