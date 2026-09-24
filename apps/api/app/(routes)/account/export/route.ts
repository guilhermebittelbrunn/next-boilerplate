import type { AccountDataExportDTO } from "@repo/sdk/src/types";
import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { buildAccountDataExport } from "@/(shared)/lib/account-export";
import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

export const GET = requireCommonPanelApi(async (req, ctx) => {
    // Impersonation stays read-only, and a read is normally allowed — but producing one
    // file with the whole dossier is extraction, not support.
    if (ctx.authRequest.isImpersonating) {
        return Response.json(
            { error: { code: "ACCOUNT_EXPORT_IMPERSONATION_FORBIDDEN" } },
            { status: HTTP_STATUS.FORBIDDEN }
        );
    }

    let payload: AccountDataExportDTO;
    try {
        payload = await buildAccountDataExport(ctx.subjectProfile);
    } catch {
        return Response.json(
            { error: { code: "ACCOUNT_EXPORT_FAILED" } },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
    }

    await recordAuditEvent({
        action: AuditAction.ACCOUNT_DATA_EXPORT,
        actorUserId: ctx.subjectProfile.id,
        actorUid: ctx.user.uid,
        actorLabel: ctx.user.email ?? null,
        targetType: AuditTargetType.ACCOUNT,
        targetUserId: ctx.subjectProfile.id,
        targetLabel: ctx.user.email ?? null,
        requestId: requestIdFrom(req),
    });

    return Response.json({ data: payload });
});
