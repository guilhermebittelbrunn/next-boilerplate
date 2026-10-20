import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { isMissingIndexError } from "@/(shared)/lib/pagination";
import { notificationRepository } from "@/(shared)/repositories/notification.repository";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

export const POST = requireCommonPanelApi(async (_req, ctx) => {
    try {
        const updated = await notificationRepository.markAllReadByUserId(
            ctx.subjectProfile.id
        );

        return Response.json({ data: { updated } });
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
