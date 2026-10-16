import type { Stripe } from "@repo/payments";
import type { PlanDTO } from "@repo/sdk/src/types";
import { listPlans } from "./billing";

const MS_PER_MINUTE = 60_000;
const CATALOG_TTL_MINUTES = 60;

export const CATALOG_TTL_MS = CATALOG_TTL_MINUTES * MS_PER_MINUTE;

type CachedCatalog = { plans: Promise<PlanDTO[]>; expiresAt: number };

let cachedCatalog: CachedCatalog | null = null;

/**
 * The catalog is public, so the provider is asked at most once an hour per process.
 * Concurrent misses share the request in flight; a failure is dropped so the next visit
 * tries again.
 */
export function listPlansCached(stripe: Stripe): Promise<PlanDTO[]> {
    const now = Date.now();
    if (cachedCatalog && cachedCatalog.expiresAt > now) {
        return cachedCatalog.plans;
    }

    const entry: CachedCatalog = {
        plans: listPlans(stripe),
        expiresAt: now + CATALOG_TTL_MS,
    };
    cachedCatalog = entry;
    entry.plans.catch(() => {
        if (cachedCatalog === entry) {
            cachedCatalog = null;
        }
    });

    return entry.plans;
}

/** Test seam: the cache outlives a single request by design. */
export function resetPlanCatalogCache(): void {
    cachedCatalog = null;
}
