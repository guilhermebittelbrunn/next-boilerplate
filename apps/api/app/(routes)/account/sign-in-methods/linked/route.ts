import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
import { hasProvider } from "@/(shared)/lib/auth-providers";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { parseSignInMethodLinked } from "@/(shared)/validation/account.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

function errorResponse(code: string, status: number) {
    return Response.json({ error: { code } }, { status });
}

/**
 * The link itself happens in the browser, where Firebase checks ownership of the provider
 * account. This only records it, and only once the account record read for this request
 * lists the provider, so a client cannot log a link that does not exist.
 */
export const POST = requireCommonPanelApi(async (req, ctx) => {
    if (ctx.subjectProfile.reference_id !== ctx.user.uid) {
        return errorResponse(
            "AUTH_REQUEST_IMPERSONATION_FORBIDDEN",
            HTTP_STATUS.FORBIDDEN
        );
    }

    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseSignInMethodLinked(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const { providerId } = parsed.value;
    if (!hasProvider(ctx.user, providerId)) {
        return errorResponse(
            "ACCOUNT_SIGN_IN_METHOD_NOT_FOUND",
            HTTP_STATUS.NOT_FOUND
        );
    }

    const label = ctx.user.email ?? ctx.user.displayName ?? null;
    await recordAuditEvent({
        action: AuditAction.ACCOUNT_SIGN_IN_METHOD_LINK,
        actorUserId: ctx.subjectProfile.id,
        actorUid: ctx.user.uid,
        actorLabel: label,
        targetType: AuditTargetType.ACCOUNT,
        targetUserId: ctx.subjectProfile.id,
        targetLabel: label,
        changedFields: [providerId],
        requestId: requestIdFrom(req),
    });

    return Response.json({ data: { confirmed: true } });
});
