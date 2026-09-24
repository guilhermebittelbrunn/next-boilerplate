/**
 * Centralized, typed React Query key factory.
 *
 * Use these instead of scattered string constants so invalidation and cache
 * writes stay consistent across hooks (lists, details) and so server prefetch
 * (RSC) and client hooks share the exact same keys.
 *
 * Hierarchy enables prefix invalidation: invalidating `entities.all` clears
 * every entity query; `entities.list()` clears just the list, etc.
 */
export const queryKeys = {
    account: {
        all: ["account"] as const,
        me: () => [...queryKeys.account.all, "me"] as const,
    },
    auditEvents: {
        all: ["auditEvents"] as const,
        // The filters belong in the key because the API resolves each combination as a
        // different query; without them the cache would mix periods and users.
        list: (filters?: { userId?: string; from?: string; to?: string }) =>
            [
                ...queryKeys.auditEvents.all,
                "list",
                filters?.userId ?? "all",
                filters?.from ?? "",
                filters?.to ?? "",
            ] as const,
    },
    entities: {
        all: ["entities"] as const,
        list: () => [...queryKeys.entities.all, "list"] as const,
        summary: () => [...queryKeys.entities.all, "summary"] as const,
        detail: (id: string) =>
            [...queryKeys.entities.all, "detail", id] as const,
    },
    users: {
        all: ["users"] as const,
        // `type` is part of the key because the API scopes the listing server-side —
        // the admin list and the impersonation (common-only) list are different data.
        list: (type?: string) =>
            [...queryKeys.users.all, "list", type ?? "all"] as const,
        summary: () => [...queryKeys.users.all, "summary"] as const,
        activitySummary: () =>
            [...queryKeys.users.all, "activitySummary"] as const,
        detail: (id: string) => [...queryKeys.users.all, "detail", id] as const,
    },
    payments: {
        all: ["payments"] as const,
        plans: () => [...queryKeys.payments.all, "plans"] as const,
    },
    health: () => ["health"] as const,
} as const;
