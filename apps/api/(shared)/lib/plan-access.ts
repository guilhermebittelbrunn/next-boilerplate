import {
    type PlanAccessDTO,
    type PlanRequirement,
    planAccessDenial,
} from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { isBillingEnabled } from "./billing";
import { isLiveSubscription } from "./billing-state";

type PlanHolder = { subscription?: unknown; entitlements?: unknown };

export function readEntitlementFeatures(stored: unknown): string[] {
    if (!stored || typeof stored !== "object") {
        return [];
    }
    const { features } = stored as { features?: unknown };
    return Array.isArray(features)
        ? features.filter((key): key is string => typeof key === "string")
        : [];
}

export function toPlanAccess(holder: PlanHolder): PlanAccessDTO {
    return {
        enforced: isBillingEnabled(),
        subscribed: isLiveSubscription(
            holder.subscription as { status?: unknown } | null | undefined
        ),
        features: readEntitlementFeatures(holder.entitlements),
    };
}

export function refusePlanAccess(
    holder: PlanHolder,
    requirement: PlanRequirement
): Response | null {
    const denial = planAccessDenial(toPlanAccess(holder), requirement);
    if (!denial) {
        return null;
    }
    return Response.json(
        { error: { code: denial } },
        { status: HTTP_STATUS.FORBIDDEN }
    );
}
