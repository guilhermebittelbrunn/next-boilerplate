import { revokeUserSessionsOrThrow } from "@repo/auth/server";
import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

export const POST = requireCommonPanelApi(async (req, ctx) => {
    try {
        await revokeUserSessionsOrThrow(ctx.user.uid);
    } catch {
        logEvent("auth", "session-revoke-failed", {
            requestId: requestIdFrom(req),
        });
        return Response.json(
            { error: { code: "ACCOUNT_SESSIONS_REVOKE_FAILED" } },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
    }

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
