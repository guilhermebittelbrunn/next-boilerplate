import { revokeUserSessions } from "@repo/auth/server";
import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

export const POST = requireCommonPanelApi(async (req, ctx) => {
    await revokeUserSessions(ctx.user.uid);

    const label = ctx.user.email ?? ctx.user.displayName ?? null;

    await recordAuditEvent({
        action: AuditAction.ACCOUNT_SESSIONS_REVOKE,
        actorUserId: ctx.subjectProfile.id,
        actorUid: ctx.user.uid,
        actorLabel: label,
        targetType: AuditTargetType.SESSION,
        targetUserId: ctx.subjectProfile.id,
        targetLabel: label,
        requestId: requestIdFrom(req),
    });

    return Response.json({ data: { confirmed: true } });
});
