import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { isMissingIndexError } from "@/(shared)/lib/pagination";
import { notificationRepository } from "@/(shared)/repositories/notification.repository";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

export const GET = requireCommonPanelApi(async (_req, ctx) => {
    try {
        const count = await notificationRepository.countUnreadByUserId(
            ctx.subjectProfile.id
        );

        return Response.json({ data: { count } });
    } catch (error) {
        if (isMissingIndexError(error)) {
            return Response.json(
                { error: { code: "NOTIFICATIONS_INDEX_MISSING" } },
                { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
            );
        }
        throw error;
    }
});
