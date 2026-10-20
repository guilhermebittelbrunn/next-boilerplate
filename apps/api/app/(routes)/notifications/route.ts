import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { encodeCursor, isMissingIndexError } from "@/(shared)/lib/pagination";
import { PaginationCursorError } from "@/(shared)/repositories/base.repository";
import { notificationRepository } from "@/(shared)/repositories/notification.repository";
import { parseListQuery } from "@/(shared)/validation/pagination.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

export const GET = requireCommonPanelApi(async (req, ctx) => {
    const parsedQuery = parseListQuery(req);
    if (!parsedQuery.ok) {
        return parsedQuery.response;
    }

    try {
        const page = await notificationRepository.listByUserId(
            ctx.subjectProfile.id,
            parsedQuery.value
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
