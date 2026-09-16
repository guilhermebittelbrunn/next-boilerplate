import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { probeDatabase } from "@/(shared)/lib/readiness";

export const dynamic = "force-dynamic";

/**
 * Public on purpose, so a load balancer and an uptime check can call it, which is why
 * the answer is a bare boolean: no dependency names, no versions, no driver message.
 */
export const GET = async (): Promise<Response> => {
    const ready = await probeDatabase();

    if (!ready) {
        return Response.json(
            { error: { code: "HEALTH_DEPENDENCY_UNAVAILABLE" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }

    return Response.json({ data: { ready: true } }, { status: HTTP_STATUS.OK });
};
