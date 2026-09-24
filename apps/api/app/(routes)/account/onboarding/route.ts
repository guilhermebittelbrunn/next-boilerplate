import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
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

    const storedState = ctx.subjectProfile.onboarding;
    const transition = advanceOnboardingState(
        storedState,
        parsed.value,
        new Date()
    );

    if (transition.kind === "unchanged") {
        return Response.json({ data: toOnboardingStateDTO(storedState) });
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

    try {
        await userRepository.update({
            id: ctx.subjectProfile.id,
            onboarding: transition.state,
        });
    } catch {
        return errorResponse(
            "ONBOARDING_UPDATE_FAILED",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }

    return Response.json({ data: toOnboardingStateDTO(transition.state) });
});
