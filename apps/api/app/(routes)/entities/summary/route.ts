import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { isMissingIndexError } from "@/(shared)/lib/pagination";
import { entityRepository } from "@/(shared)/repositories/entity.repository";
import { requireOrganizationApi } from "@/app/(guards)/organization";

export const GET = requireOrganizationApi(async (_req, ctx) => {
    try {
        const summary = await entityRepository.summaryByOrganization(
            ctx.organization.organizationId
        );

        return Response.json({ data: summary });
    } catch (error) {
        if (isMissingIndexError(error)) {
            return Response.json(
                { error: { code: "SUMMARY_INDEX_MISSING" } },
                { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
            );
        }
        throw error;
    }
});
