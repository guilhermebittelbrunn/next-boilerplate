import type { PlanRequirement, UserDTO } from "@repo/sdk/src/types";
import { refusePlanAccess } from "@/(shared)/lib/plan-access";
import { requireCommonPanelApi } from "./common-panel";

type RouteContext = Record<string, unknown> | undefined;

/** `null` leaves the route ungated. A function is resolved again on every request. */
export type PlanRequirementSource =
    | PlanRequirement
    | null
    | (() => PlanRequirement | null);

const resolveRequirement = (
    source: PlanRequirementSource
): PlanRequirement | null => (typeof source === "function" ? source() : source);

/** The refusal a guard answers with when the subject's plan does not meet the source. */
export function refusePlanRequirement(
    subject: UserDTO,
    source: PlanRequirementSource
): Response | null {
    const requirement = resolveRequirement(source);
    return requirement ? refusePlanAccess(subject, requirement) : null;
}

/**
 * Composed over the common-panel guard, so an impersonated write is still refused as
 * read-only before the plan is looked at.
 */
export function requirePlanApi<TRouteContext extends RouteContext = undefined>(
    source: PlanRequirementSource,
    handler: Parameters<typeof requireCommonPanelApi<TRouteContext>>[0]
) {
    return requireCommonPanelApi<TRouteContext>((req, ctx) => {
        const refusal = refusePlanRequirement(ctx.subjectProfile, source);
        return refusal ? Promise.resolve(refusal) : handler(req, ctx);
    });
}
