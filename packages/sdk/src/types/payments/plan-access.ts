export type EntitlementsState = {
    /** Provider lookup keys of the features the customer holds right now. */
    features: string[];
    /** Creation instant of the provider event that produced this list. */
    lastEventAt: Date;
};

export type EntitlementsStateDTO = Omit<EntitlementsState, "lastEventAt"> & {
    lastEventAt: string;
};

/** An empty requirement asks only for a live subscription. */
export type PlanRequirement = { feature?: string };

export const PLAN_ACCESS_DENIALS = [
    "PLAN_SUBSCRIPTION_REQUIRED",
    "PLAN_FEATURE_REQUIRED",
] as const;

export type PlanAccessDenial = (typeof PLAN_ACCESS_DENIALS)[number];

/** `enforced: false` means billing is off in this environment, so nothing is gated. */
export type PlanAccessDTO = {
    enforced: boolean;
    subscribed: boolean;
    features: string[];
};

/**
 * Status and features arrive in separate provider events that can land out of order, so
 * access needs both and a denial from either one wins.
 */
export function planAccessDenial(
    access: PlanAccessDTO,
    requirement: PlanRequirement
): PlanAccessDenial | null {
    if (!access.enforced) {
        return null;
    }
    if (!access.subscribed) {
        return "PLAN_SUBSCRIPTION_REQUIRED";
    }
    if (requirement.feature && !access.features.includes(requirement.feature)) {
        return "PLAN_FEATURE_REQUIRED";
    }
    return null;
}
