import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRecord } from "@/(shared)/mappers/session.mapper";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@repo/auth/server", () => ({
    createSessionCookie: vi.fn(),
    verifyIdTokenClaims: vi.fn(),
}));
vi.mock("@/(shared)/repositories/session.repository", () => ({
    sessionRepository: {},
}));

const { selectActiveSessions } = await import("@/(shared)/lib/session-tracker");

const NOW = Date.parse("2026-09-30T12:00:00.000Z");
const DAY_SECONDS = 86_400;
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const NOW_SECONDS = NOW / MS_PER_SECOND;
const BEYOND_CAP_DAYS = 31;
const SIGN_OUT_EVERYWHERE_DAYS = 3;
const BEFORE_SIGN_OUT_EVERYWHERE_DAYS = 5;
const TWO_DAYS = 2;
const THREE_DAYS = 3;
const FOUR_DAYS = 4;
const TWO_AND_A_HALF_HOURS_MS = 9_000_000;

function keyDaysAgo(days: number): string {
    return String(Math.trunc(NOW_SECONDS - days * DAY_SECONDS));
}

function session(
    sessionKey: string,
    overrides: Partial<SessionRecord> = {}
): SessionRecord {
    const signedInAt = new Date(
        Number(sessionKey) * MS_PER_SECOND
    ).toISOString();
    return {
        id: `uid-1_${sessionKey}`,
        uid: "uid-1",
        sessionKey,
        signedInAt,
        lastSeenAt: signedInAt,
        browser: "Chrome",
        os: "macOS",
        deviceType: "desktop",
        revokedAt: null,
        revokedReason: null,
        othersRevokedBefore: null,
        createdAt: signedInAt,
        updatedAt: signedInAt,
        deletedAt: null,
        ...overrides,
    };
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    process.env.SESSION_ABSOLUTE_MAX_AGE_DAYS = "";
    process.env.SESSION_COOKIE_MAX_AGE_DAYS = "";
});

afterEach(() => {
    vi.useRealTimers();
});

describe("selectActiveSessions", () => {
    it("tira as encerradas, as anteriores à revogação geral e as além do teto", () => {
        const kept = keyDaysAgo(1);
        const result = selectActiveSessions(
            [
                session(kept),
                session(keyDaysAgo(2), {
                    revokedAt: new Date(NOW).toISOString(),
                }),
                session(keyDaysAgo(BEFORE_SIGN_OUT_EVERYWHERE_DAYS)),
                session(keyDaysAgo(BEYOND_CAP_DAYS)),
            ],
            {
                currentKey: null,
                tokensValidAfterTime: new Date(
                    NOW - SIGN_OUT_EVERYWHERE_DAYS * DAY_SECONDS * MS_PER_SECOND
                ).toUTCString(),
            }
        );

        expect(result.map((item) => item.id)).toEqual([kept]);
    });

    it("põe a atual primeiro e as outras pelo último uso, da mais recente", () => {
        const current = keyDaysAgo(THREE_DAYS);
        const recent = keyDaysAgo(FOUR_DAYS);
        const older = keyDaysAgo(TWO_DAYS);
        const result = selectActiveSessions(
            [
                session(older, {
                    lastSeenAt: new Date(NOW - 2 * MS_PER_HOUR).toISOString(),
                }),
                session(current, {
                    lastSeenAt: new Date(
                        NOW - TWO_AND_A_HALF_HOURS_MS
                    ).toISOString(),
                }),
                session(recent, {
                    lastSeenAt: new Date(NOW - MS_PER_MINUTE).toISOString(),
                }),
            ],
            { currentKey: current, tokensValidAfterTime: undefined }
        );

        expect(result.map((item) => [item.id, item.current])).toEqual([
            [current, true],
            [recent, false],
            [older, false],
        ]);
    });

    it("não expõe uid, id interno nem campos de revogação", () => {
        const [item] = selectActiveSessions([session(keyDaysAgo(1))], {
            currentKey: null,
            tokensValidAfterTime: undefined,
        });

        expect(Object.keys(item).sort()).toEqual([
            "browser",
            "current",
            "deviceType",
            "id",
            "lastSeenAt",
            "os",
            "signedInAt",
        ]);
    });
});
