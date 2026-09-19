import { Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { touchLastAccessMock } = vi.hoisted(() => ({
    touchLastAccessMock: vi.fn(),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        touchLastAccess: (...args: unknown[]) => touchLastAccessMock(...args),
    },
}));

const {
    recordUserActivity,
    resetActivityDedupeCache,
    activityWindowStartMs,
    activityWindowKey,
    isStampedInWindow,
    ACTIVITY_WINDOW_MINUTES,
    ACTIVITY_WINDOW_MS,
} = await import("@/(shared)/lib/activity-recorder");

const NOW = "2026-09-17T14:03:00.000Z";
const WINDOW_START = "2026-09-17T14:00:00.000Z";
const NEXT_WINDOW = "2026-09-17T14:16:00.000Z";

let warned: string[];

beforeEach(() => {
    touchLastAccessMock.mockReset();
    touchLastAccessMock.mockResolvedValue(undefined);
    resetActivityDedupeCache();

    warned = [];
    vi.spyOn(console, "warn").mockImplementation((line: string) => {
        warned.push(line);
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("activity window", () => {
    it("is the documented 15 minutes", () => {
        const FIFTEEN = 15;
        expect(ACTIVITY_WINDOW_MINUTES).toBe(FIFTEEN);
    });

    it("floors an instant to the start of its window", () => {
        expect(activityWindowStartMs(Date.parse(NOW))).toBe(
            Date.parse(WINDOW_START)
        );
    });

    it("gives the same key to two moments inside one window", () => {
        const ALMOST_THE_WHOLE_WINDOW = ACTIVITY_WINDOW_MS - 1;

        expect(activityWindowKey("p1", Date.parse(WINDOW_START) + 1)).toBe(
            activityWindowKey(
                "p1",
                Date.parse(WINDOW_START) + ALMOST_THE_WHOLE_WINDOW
            )
        );
    });

    it("separates two users sharing a window", () => {
        const at = Date.parse(NOW);

        expect(activityWindowKey("p1", at)).not.toBe(
            activityWindowKey("p2", at)
        );
    });
});

describe("isStampedInWindow", () => {
    const windowStart = Date.parse(WINDOW_START);

    it("treats an absent stamp as not stamped", () => {
        expect(isStampedInWindow(undefined, windowStart)).toBe(false);
        expect(isStampedInWindow(null, windowStart)).toBe(false);
    });

    it("reads a Firestore Timestamp inside the window", () => {
        expect(
            isStampedInWindow(Timestamp.fromDate(new Date(NOW)), windowStart)
        ).toBe(true);
    });

    it("reads a plain Date from a profile written within the request", () => {
        expect(isStampedInWindow(new Date(NOW), windowStart)).toBe(true);
    });

    it("reads the ISO string the API mapper produces", () => {
        expect(isStampedInWindow(NOW, windowStart)).toBe(true);
    });

    it("rejects a stamp that belongs to an earlier window", () => {
        expect(isStampedInWindow("2026-09-17T13:59:59.000Z", windowStart)).toBe(
            false
        );
    });
});

describe("recordUserActivity", () => {
    it("writes once however many requests land in the window", async () => {
        const REQUESTS_IN_THE_WINDOW = 50;

        for (let i = 0; i < REQUESTS_IN_THE_WINDOW; i += 1) {
            await recordUserActivity({ id: "p1" });
        }

        expect(touchLastAccessMock).toHaveBeenCalledTimes(1);
    });

    it("writes the instant of the request, not a server sentinel", async () => {
        await recordUserActivity({ id: "p1" });

        const [id, at] = touchLastAccessMock.mock.calls[0] ?? [];
        expect(id).toBe("p1");
        expect(at).toBeInstanceOf(Date);
        expect((at as Date).toISOString()).toBe(NOW);
    });

    it("writes again once the window has rolled over", async () => {
        await recordUserActivity({ id: "p1" });
        vi.setSystemTime(new Date(NEXT_WINDOW));
        await recordUserActivity({ id: "p1" });

        const BOTH_WINDOWS = 2;
        expect(touchLastAccessMock).toHaveBeenCalledTimes(BOTH_WINDOWS);
    });

    it("keeps one user's window from covering another's", async () => {
        await recordUserActivity({ id: "p1" });
        await recordUserActivity({ id: "p2" });

        const ONE_EACH = 2;
        expect(touchLastAccessMock).toHaveBeenCalledTimes(ONE_EACH);
    });

    /**
     * The case the in-memory cache cannot cover: on a serverless platform each request may
     * land on a cold process. What has to hold the write rate down is the instant that came
     * in the document the guard already read.
     */
    it("still writes once per window with the dedupe cache cold every time", async () => {
        const REQUESTS_ON_COLD_PROCESSES = 50;
        const alreadyStamped = Timestamp.fromDate(new Date(WINDOW_START));

        for (let i = 0; i < REQUESTS_ON_COLD_PROCESSES; i += 1) {
            resetActivityDedupeCache();
            await recordUserActivity({
                id: "p1",
                lastAccessAt: alreadyStamped,
            });
        }

        expect(touchLastAccessMock).not.toHaveBeenCalled();
    });

    it("writes on a cold process when the document stamp is from an older window", async () => {
        resetActivityDedupeCache();

        await recordUserActivity({
            id: "p1",
            lastAccessAt: Timestamp.fromDate(
                new Date("2026-09-17T13:40:00.000Z")
            ),
        });

        expect(touchLastAccessMock).toHaveBeenCalledTimes(1);
    });

    it("stays silent on a successful write", async () => {
        await recordUserActivity({ id: "p1" });

        expect(touchLastAccessMock).toHaveBeenCalledTimes(1);
        expect(warned).toEqual([]);
    });

    it("serves the request when the stamp write is refused", async () => {
        touchLastAccessMock.mockRejectedValue(
            Object.assign(new Error("unavailable"), { name: "FirebaseError" })
        );

        await expect(recordUserActivity({ id: "p1" })).resolves.toBeUndefined();
        expect(warned[0]).toContain("[account] activity-stamp-failed");
        expect(warned[0]).toContain("reason=FirebaseError");
    });

    it("logs the gRPC status a refused write came with", async () => {
        const RESOURCE_EXHAUSTED = 8;
        touchLastAccessMock.mockRejectedValue(
            Object.assign(new Error("quota exceeded"), {
                code: RESOURCE_EXHAUSTED,
            })
        );

        await recordUserActivity({ id: "p1" });

        expect(warned[0]).toContain("status=8");
    });

    it("never logs the failure message, which can carry a document path", async () => {
        touchLastAccessMock.mockRejectedValue(
            new Error("permission denied on /user/secret-doc")
        );

        await recordUserActivity({ id: "p1" });

        expect(warned[0]).not.toContain("secret-doc");
    });

    /**
     * The known limit of a design without a transaction: the cache is only written after
     * the round-trip returns, so two requests that start before the first write lands both
     * read an unstamped document and both write. It costs one extra write per window at
     * most, and the test is here so a change in that cost is deliberate.
     */
    it("writes twice when two requests reach the unstamped document together", async () => {
        const release: (() => void)[] = [];
        touchLastAccessMock.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    release.push(resolve);
                })
        );

        const concurrent = Promise.all([
            recordUserActivity({ id: "p1" }),
            recordUserActivity({ id: "p1" }),
        ]);

        const BOTH_READ_BEFORE_EITHER_WROTE = 2;
        expect(touchLastAccessMock).toHaveBeenCalledTimes(
            BOTH_READ_BEFORE_EITHER_WROTE
        );

        for (const resolve of release) {
            resolve();
        }
        await concurrent;
    });

    it("writes once for the requests that arrive after the race settled", async () => {
        await Promise.all([
            recordUserActivity({ id: "p1" }),
            recordUserActivity({ id: "p1" }),
        ]);
        touchLastAccessMock.mockClear();

        await recordUserActivity({ id: "p1" });

        expect(touchLastAccessMock).not.toHaveBeenCalled();
    });

    it("retries the window after a failed write instead of caching the miss", async () => {
        touchLastAccessMock.mockRejectedValueOnce(new Error("unavailable"));

        await recordUserActivity({ id: "p1" });
        await recordUserActivity({ id: "p1" });

        const FAILED_THEN_SUCCEEDED = 2;
        expect(touchLastAccessMock).toHaveBeenCalledTimes(
            FAILED_THEN_SUCCEEDED
        );
    });
});

/**
 * The cache is bounded so a long-lived process serving many users cannot grow it without
 * end. Evicting a key costs one extra write for that user in the current window, which is
 * the same cost a cold process already pays.
 */
describe("dedupe cache capacity", () => {
    const CACHE_CAPACITY = 500;

    async function fillCacheBeyondCapacity(): Promise<void> {
        for (let i = 0; i <= CACHE_CAPACITY; i += 1) {
            await recordUserActivity({ id: `u${i}` });
        }
    }

    it("keeps the newest key when the cache overflows", async () => {
        await fillCacheBeyondCapacity();
        touchLastAccessMock.mockClear();

        await recordUserActivity({ id: `u${CACHE_CAPACITY}` });

        expect(touchLastAccessMock).not.toHaveBeenCalled();
    });

    it("drops the oldest key when the cache overflows", async () => {
        await fillCacheBeyondCapacity();
        touchLastAccessMock.mockClear();

        await recordUserActivity({ id: "u0" });

        expect(touchLastAccessMock).toHaveBeenCalledTimes(1);
    });

    it("does not write for an evicted user whose document already carries the stamp", async () => {
        await fillCacheBeyondCapacity();
        touchLastAccessMock.mockClear();

        await recordUserActivity({
            id: "u0",
            lastAccessAt: Timestamp.fromDate(new Date(WINDOW_START)),
        });

        expect(touchLastAccessMock).not.toHaveBeenCalled();
    });
});
