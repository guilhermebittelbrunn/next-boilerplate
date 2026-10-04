import { getUserById } from "@repo/auth/server";
import { resolveRequestSessionKey } from "@/(shared)/lib/session-key";
import { selectActiveSessions } from "@/(shared)/lib/session-tracker";
import { sessionRepository } from "@/(shared)/repositories/session.repository";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

/**
 * Under impersonation the list is the subject's, and none of it is the operator's own
 * session, so nothing is marked as current.
 */
export const GET = requireCommonPanelApi(async (req, ctx) => {
    const subjectUid = ctx.authRequest.requestUserId;
    const impersonating = ctx.authRequest.isImpersonating;

    const [records, currentKey, subject] = await Promise.all([
        sessionRepository.listByUid(subjectUid),
        impersonating ? null : resolveRequestSessionKey(req),
        impersonating ? getUserById(subjectUid) : ctx.user,
    ]);

    return Response.json({
        data: selectActiveSessions(records, {
            currentKey,
            tokensValidAfterTime: subject?.tokensValidAfterTime,
        }),
    });
});
