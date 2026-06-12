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
    entities: {
        all: ["entities"] as const,
        list: () => [...queryKeys.entities.all, "list"] as const,
        detail: (id: string) =>
            [...queryKeys.entities.all, "detail", id] as const,
    },
    users: {
        all: ["users"] as const,
        // Single cached list; callers filter by `type` in memory via `select`.
        list: () => [...queryKeys.users.all, "list"] as const,
        detail: (id: string) => [...queryKeys.users.all, "detail", id] as const,
    },
    health: () => ["health"] as const,
} as const;
