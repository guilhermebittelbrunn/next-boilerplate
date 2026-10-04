import type { PlanRequirement } from "@repo/sdk/src/types";
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

/**
 * Composed over the common-panel guard, so an impersonated write is still refused as
 * read-only before the plan is looked at.
 */
export function requirePlanApi<TRouteContext extends RouteContext = undefined>(
    source: PlanRequirementSource,
    handler: Parameters<typeof requireCommonPanelApi<TRouteContext>>[0]
) {
    return requireCommonPanelApi<TRouteContext>((req, ctx) => {
        const requirement = resolveRequirement(source);
        const refusal = requirement
            ? refusePlanAccess(ctx.subjectProfile, requirement)
            : null;
        return refusal ? Promise.resolve(refusal) : handler(req, ctx);
    });
}
