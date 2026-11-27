import { AuditAction } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { recordAccountLifecycleEvent } from "@/(shared)/lib/audit-recorder";
import {
    advanceOnboardingState,
    toOnboardingStateDTO,
} from "@/(shared)/lib/onboarding";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { userRepository } from "@/(shared)/repositories/user.repository";
import { parseAdvanceOnboarding } from "@/(shared)/validation/account.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

const errorResponse = (code: string, status: number): Response =>
    Response.json({ error: { code } }, { status });

export const POST = requireCommonPanelApi(async (req, ctx) => {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseAdvanceOnboarding(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const now = new Date();
    const outcome = await userRepository
        .advanceOnboarding(ctx.subjectProfile.id, (current) =>
            advanceOnboardingState(current, parsed.value, now)
        )
        .catch(() => null);
    if (!outcome) {
        return errorResponse(
            "ONBOARDING_UPDATE_FAILED",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }

    const { stored, transition } = outcome;
    if (transition.kind === "unchanged") {
        return Response.json({ data: toOnboardingStateDTO(stored) });
    }
    if (transition.kind === "out-of-order") {
        return errorResponse(
            "ONBOARDING_STEP_OUT_OF_ORDER",
            HTTP_STATUS.CONFLICT
        );
    }
    if (transition.kind === "not-skippable") {
        return errorResponse(
            "ONBOARDING_STEP_NOT_SKIPPABLE",
            HTTP_STATUS.BAD_REQUEST
        );
    }

    if (transition.state.completedAt !== null) {
        await recordAccountLifecycleEvent({
            action: AuditAction.ACCOUNT_ONBOARDING_COMPLETE,
            profileId: ctx.subjectProfile.id,
            uid: ctx.subjectProfile.reference_id,
            label: ctx.user.email ?? ctx.user.displayName ?? null,
            requestId: requestIdFrom(req),
        });
    }

    return Response.json({ data: toOnboardingStateDTO(transition.state) });
});
