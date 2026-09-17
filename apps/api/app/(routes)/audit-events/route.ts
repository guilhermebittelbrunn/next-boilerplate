import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { encodeCursor, isMissingIndexError } from "@/(shared)/lib/pagination";
import { auditEventRepository } from "@/(shared)/repositories/audit-event.repository";
import { PaginationCursorError } from "@/(shared)/repositories/base.repository";
import { parseAuditListQuery } from "@/(shared)/validation/audit.schema";
import { requireAdminApi } from "@/app/(guards)/admin";

// Read-only on purpose: no other verb is exported, so there is no route that edits or
// removes a recorded event.
export const GET = requireAdminApi(async (req) => {
    const parsed = parseAuditListQuery(req);
    if (!parsed.ok) {
        return parsed.response;
    }

    const { limit, cursorId, userId, from, to } = parsed.value;

    try {
        const page = await auditEventRepository.listPage(
            { userId, from, to },
            { limit, cursorId }
        );

        return Response.json({
            data: {
                items: page.items,
                nextCursor: page.nextCursorId
                    ? encodeCursor(page.nextCursorId)
                    : null,
            },
        });
    } catch (error) {
        if (error instanceof PaginationCursorError) {
            return Response.json(
                { error: { code: "PAGINATION_CURSOR_INVALID" } },
                { status: HTTP_STATUS.BAD_REQUEST }
            );
        }
        if (isMissingIndexError(error)) {
            return Response.json(
                { error: { code: "PAGINATION_INDEX_MISSING" } },
                { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
            );
        }
        throw error;
    }
});
