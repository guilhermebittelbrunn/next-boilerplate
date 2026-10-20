import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { isUsableDocumentId } from "@/(shared)/lib/pagination";
import {
    type RouteIdParamsContext,
    resolveIdFromContext,
} from "@/(shared)/lib/resolve-route-id";
import { notificationRepository } from "@/(shared)/repositories/notification.repository";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

const notFound = () =>
    Response.json(
        { error: { code: "NOTIFICATION_NOT_FOUND" } },
        { status: HTTP_STATUS.NOT_FOUND }
    );

export const POST = requireCommonPanelApi<RouteIdParamsContext>(
    async (_req, ctx) => {
        const id = await resolveIdFromContext(ctx);
        // An encoded `/` or a reserved id would make the Firestore driver throw on the path.
        if (!isUsableDocumentId(id)) {
            return notFound();
        }

        const row = await notificationRepository.findById(id);
        if (!row || row.userId !== ctx.subjectProfile.id) {
            return notFound();
        }

        const readAt =
            row.readAt ?? (await notificationRepository.markRead(id));

        return Response.json({ data: { id, readAt } });
    }
);
