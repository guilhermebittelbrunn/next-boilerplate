import type { PlanRequirement } from "@repo/sdk/src/types";
import { env } from "@/env";

export function entityPlanRequirement(): PlanRequirement | null {
    const feature = env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE;
    return feature ? { feature } : null;
}
