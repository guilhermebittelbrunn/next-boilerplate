import { beforeEach, describe, expect, it, vi } from "vitest";

type Clause = [string, string, unknown];

type BucketCounts = {
    total: number;
    last7Days: number;
    from8To30Days: number;
    from31To90Days: number;
    over90Days: number;
};

/**
 * Records the clauses of every aggregation the repository builds and answers each one
 * with a scripted count. Only `count()` is wired: a leak into document reads shows up as
 * an undefined method rather than as a silently expensive query.
 */
const { fakeDb, counts, emitted } = vi.hoisted(() => {
    const emittedQueries: Clause[][] = [];
    const scriptedCounts: number[] = [];

    const query = (clauses: Clause[]) => ({
        where: (field: string, op: string, value: unknown) =>
            query([...clauses, [field, op, value]]),
        count: () => ({
            get: () => {
                emittedQueries.push(clauses);
                const next = scriptedCounts.shift() ?? 0;
                return Promise.resolve({ data: () => ({ count: next }) });
            },
        }),
    });

    return {
        fakeDb: { collection: () => query([]) },
        counts: scriptedCounts,
        emitted: emittedQueries,
    };
});

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({ getUser: vi.fn() }),
    getCurrentUser: vi.fn(),
}));

vi.mock("@/(shared)/infra/database", () => ({ default: fakeDb }));

const { userRepository } = await import(
    "@/(shared)/repositories/user.repository"
);

const NOW = new Date("2026-09-19T12:00:00.000Z");

const MIXED_BASE: BucketCounts = {
    total: 100,
    last7Days: 12,
    from8To30Days: 7,
    from31To90Days: 23,
    over90Days: 18,
};
const MIXED_BASE_NEVER = 40;
const MIXED_BASE_INACTIVE = 41;

const NEVER_STAMPED_BASE: BucketCounts = {
    total: 900,
    last7Days: 0,
    from8To30Days: 0,
    from31To90Days: 0,
    over90Days: 0,
};

/** More stamps than the total: what a profile created mid-aggregation looks like. */
const RACED_BASE: BucketCounts = {
    total: 10,
    last7Days: 6,
    from8To30Days: 4,
    from31To90Days: 3,
    over90Days: 2,
};

const SINGLE_ADMIN_BASE: BucketCounts = {
    total: 1,
    last7Days: 1,
    from8To30Days: 0,
    from31To90Days: 0,
    over90Days: 0,
};

const EXPECTED_THRESHOLDS = {
    activeDays: 7,
    inactiveDays: 30,
    precisionMinutes: 15,
};

const AGGREGATIONS_PER_CALL = 5;
const OLDEST_BUCKET_INDEX = 4;

/** The repository awaits the total first, then the four buckets, newest first. */
function givenCounts(base: BucketCounts) {
    counts.push(
        base.total,
        base.last7Days,
        base.from8To30Days,
        base.from31To90Days,
        base.over90Days
    );
}

beforeEach(() => {
    counts.length = 0;
    emitted.length = 0;
});

describe("userRepository.activitySummary", () => {
    it("answers the buckets it counted and derives the one it cannot", async () => {
        givenCounts(MIXED_BASE);

        const summary = await userRepository.activitySummary(NOW);

        expect(summary.byRecency).toEqual({
            last7Days: MIXED_BASE.last7Days,
            from8To30Days: MIXED_BASE.from8To30Days,
            from31To90Days: MIXED_BASE.from31To90Days,
            over90Days: MIXED_BASE.over90Days,
            never: MIXED_BASE_NEVER,
        });
    });

    it("counts the recent bucket as active and the two oldest as inactive", async () => {
        givenCounts(MIXED_BASE);

        const summary = await userRepository.activitySummary(NOW);

        expect(summary.active).toBe(MIXED_BASE.last7Days);
        expect(summary.inactive).toBe(MIXED_BASE_INACTIVE);
    });

    it("leaves a profile with no stamp out of both headline numbers", async () => {
        givenCounts(NEVER_STAMPED_BASE);

        const summary = await userRepository.activitySummary(NOW);

        expect(summary.byRecency.never).toBe(NEVER_STAMPED_BASE.total);
        expect(summary.active).toBe(0);
        expect(summary.inactive).toBe(0);
    });

    it("clamps the derived bucket instead of publishing a negative count", async () => {
        givenCounts(RACED_BASE);

        const summary = await userRepository.activitySummary(NOW);

        expect(summary.byRecency.never).toBe(0);
    });

    it("publishes the thresholds so the screen does not hardcode them", async () => {
        givenCounts(SINGLE_ADMIN_BASE);

        const summary = await userRepository.activitySummary(NOW);

        expect(summary.thresholds).toEqual(EXPECTED_THRESHOLDS);
    });

    it("scopes every count to the live profiles", async () => {
        givenCounts(SINGLE_ADMIN_BASE);

        await userRepository.activitySummary(NOW);

        expect(emitted).toHaveLength(AGGREGATIONS_PER_CALL);
        for (const clauses of emitted) {
            expect(clauses[0]).toEqual(["deletedAt", "==", null]);
        }
    });

    it("bounds the oldest bucket on both sides, keeping a null stamp out of it", async () => {
        givenCounts(SINGLE_ADMIN_BASE);

        await userRepository.activitySummary(NOW);

        const oldest = emitted[OLDEST_BUCKET_INDEX];
        expect(oldest[1]).toEqual(["lastAccessAt", ">=", new Date(0)]);
        expect(oldest[2][1]).toBe("<");
    });

    it("asks the total without touching lastAccessAt, so unstamped profiles are counted", async () => {
        givenCounts(SINGLE_ADMIN_BASE);

        await userRepository.activitySummary(NOW);

        expect(emitted[0]).toEqual([["deletedAt", "==", null]]);
    });
});
