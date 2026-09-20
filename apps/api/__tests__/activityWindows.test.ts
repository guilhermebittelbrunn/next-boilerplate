import { describe, expect, it } from "vitest";
import {
    ACTIVE_WINDOW_DAYS,
    ACTIVITY_WINDOW_MINUTES,
    type ActivityRange,
    buildActivityRecencyRanges,
    INACTIVE_AFTER_DAYS,
} from "@/(shared)/lib/activity-windows";

const NOW = new Date("2026-09-19T12:00:00.000Z");
const DAY_MS = 86_400_000;

const ACTIVE_EDGE_DAYS = 7;
const INACTIVE_EDGE_DAYS = 30;
const STALE_EDGE_DAYS = 90;
const EXPECTED_PRECISION_MINUTES = 15;

const HALF_DAY = 0.5;
const VERY_OLD_DAYS = 400;

/** The boundary itself plus one probe on each side of it, then the extremes. */
const PROBE_DAYS = [
    HALF_DAY,
    ...[ACTIVE_EDGE_DAYS, INACTIVE_EDGE_DAYS, STALE_EDGE_DAYS].flatMap(
        (edge) => [edge - HALF_DAY, edge, edge + HALF_DAY]
    ),
    VERY_OLD_DAYS,
];

const ranges = buildActivityRecencyRanges(NOW);

function daysBefore(days: number): string {
    return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

function boundsOf(range: ActivityRange): [string, string | null] {
    return [range.from.toISOString(), range.to?.toISOString() ?? null];
}

describe("buildActivityRecencyRanges", () => {
    it("opens the most recent bucket at the active threshold and leaves it unbounded", () => {
        expect(boundsOf(ranges.last7Days)).toEqual([
            daysBefore(ACTIVE_EDGE_DAYS),
            null,
        ]);
    });

    it("hands each older bucket the previous lower bound as its ceiling", () => {
        expect(boundsOf(ranges.from8To30Days)).toEqual([
            daysBefore(INACTIVE_EDGE_DAYS),
            daysBefore(ACTIVE_EDGE_DAYS),
        ]);
        expect(boundsOf(ranges.from31To90Days)).toEqual([
            daysBefore(STALE_EDGE_DAYS),
            daysBefore(INACTIVE_EDGE_DAYS),
        ]);
    });

    it("floors the oldest bucket at the epoch so a null stamp stays out of the range", () => {
        expect(boundsOf(ranges.over90Days)).toEqual([
            new Date(0).toISOString(),
            daysBefore(STALE_EDGE_DAYS),
        ]);
    });

    it("leaves no gap and no overlap between consecutive buckets", () => {
        const ordered = [
            ranges.over90Days,
            ranges.from31To90Days,
            ranges.from8To30Days,
            ranges.last7Days,
        ];

        for (let index = 0; index < ordered.length - 1; index++) {
            expect(ordered[index].to?.getTime()).toBe(
                ordered[index + 1].from.getTime()
            );
        }
    });

    it("places an instant in exactly one bucket, whichever instant it is", () => {
        const probes = PROBE_DAYS.map(
            (days) => new Date(NOW.getTime() - days * DAY_MS)
        );

        for (const probe of probes) {
            const matching = Object.values(ranges).filter(
                ({ from, to }) =>
                    probe.getTime() >= from.getTime() &&
                    (to === null || probe.getTime() < to.getTime())
            );

            expect(matching).toHaveLength(1);
        }
    });

    it("publishes the thresholds the cards print", () => {
        expect(ACTIVE_WINDOW_DAYS).toBe(ACTIVE_EDGE_DAYS);
        expect(INACTIVE_AFTER_DAYS).toBe(INACTIVE_EDGE_DAYS);
        expect(ACTIVITY_WINDOW_MINUTES).toBe(EXPECTED_PRECISION_MINUTES);
    });
});
