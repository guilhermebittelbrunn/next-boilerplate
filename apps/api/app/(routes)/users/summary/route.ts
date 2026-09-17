import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { isMissingIndexError } from "@/(shared)/lib/pagination";
import { userRepository } from "@/(shared)/repositories/user.repository";
import { requireAdminApi } from "@/app/(guards)/admin";

export const GET = requireAdminApi(async () => {
    try {
        const summary = await userRepository.summary();

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
