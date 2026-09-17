import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { appendMock, appendOnceMock, resolveLabelMock } = vi.hoisted(() => ({
    appendMock: vi.fn(),
    appendOnceMock: vi.fn(),
    resolveLabelMock: vi.fn(),
}));

vi.mock("@/(shared)/repositories/audit-event.repository", () => ({
    auditEventRepository: {
        append: (...args: unknown[]) => appendMock(...args),
        appendOnce: (...args: unknown[]) => appendOnceMock(...args),
    },
}));

vi.mock("@/(shared)/lib/audit-label", () => ({
    resolveUserAuditLabel: (...args: unknown[]) => resolveLabelMock(...args),
}));

const {
    recordAuditEvent,
    recordImpersonationSession,
    impersonationWindowKey,
    resetImpersonationDedupeCache,
    IMPERSONATION_WINDOW_MS,
} = await import("@/(shared)/lib/audit-recorder");

const ACTOR = {
    actorUserId: "p1",
    actorUid: "auth-admin",
    actorLabel: "admin@example.com",
};

function deleteInput(overrides: Record<string, unknown> = {}) {
    return {
        action: AuditAction.USER_DELETE,
        ...ACTOR,
        targetType: AuditTargetType.USER,
        targetUserId: "p2",
        targetLabel: "removed@example.com",
        requestId: "req-1",
        ...overrides,
    };
}

function impersonationInput(overrides: Record<string, unknown> = {}) {
    return {
        ...ACTOR,
        subjectUserId: "p2",
        subjectUid: "auth-common",
        requestId: "req-1",
        ...overrides,
    };
}

let warned: string[];

beforeEach(() => {
    for (const mock of [appendMock, appendOnceMock, resolveLabelMock]) {
        mock.mockReset();
    }
    appendMock.mockResolvedValue({ id: "evt-1" });
    appendOnceMock.mockResolvedValue(true);
    resolveLabelMock.mockResolvedValue("subject@example.com");
    resetImpersonationDedupeCache();

    warned = [];
    vi.spyOn(console, "warn").mockImplementation((line: string) => {
        warned.push(line);
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("recordAuditEvent", () => {
    it("merges actor, target and subject into the field the user filter reads", async () => {
        await recordAuditEvent(
            deleteInput({
                action: AuditAction.IMPERSONATION_SESSION,
                onBehalfOfUserId: "p3",
            })
        );

        expect(appendMock.mock.calls[0]?.[0].involvedUserIds).toEqual([
            "p1",
            "p2",
            "p3",
        ]);
    });

    it("keeps a single entry when the actor is also the target", async () => {
        await recordAuditEvent(
            deleteInput({
                action: AuditAction.ACCOUNT_PASSWORD_CHANGE,
                targetUserId: "p1",
            })
        );

        expect(appendMock.mock.calls[0]?.[0].involvedUserIds).toEqual(["p1"]);
    });

    it("leaves out an absent target instead of writing a null into the array", async () => {
        await recordAuditEvent(deleteInput({ targetUserId: null }));

        expect(appendMock.mock.calls[0]?.[0].involvedUserIds).toEqual(["p1"]);
    });

    it("defaults the changed fields to an empty list", async () => {
        await recordAuditEvent(deleteInput());

        expect(appendMock.mock.calls[0]?.[0].changedFields).toEqual([]);
    });

    it("carries the changed field names through untouched", async () => {
        await recordAuditEvent(
            deleteInput({
                action: AuditAction.USER_UPDATE,
                changedFields: ["type", "disabled"],
            })
        );

        expect(appendMock.mock.calls[0]?.[0].changedFields).toEqual([
            "type",
            "disabled",
        ]);
    });

    it("leaves the window end null outside impersonation", async () => {
        await recordAuditEvent(deleteInput());

        expect(appendMock.mock.calls[0]?.[0].windowEndsAt).toBeNull();
    });

    it("swallows a refused write so the action it describes still succeeds", async () => {
        appendMock.mockRejectedValue(
            Object.assign(new Error("permission denied on /auditEvent/x"), {
                name: "FirebaseError",
            })
        );

        await expect(recordAuditEvent(deleteInput())).resolves.toBeUndefined();
    });

    it("falls back to a log line naming the action and the request", async () => {
        appendMock.mockRejectedValue(
            Object.assign(new Error("permission denied on /auditEvent/x"), {
                name: "FirebaseError",
            })
        );

        await recordAuditEvent(deleteInput());

        expect(warned).toHaveLength(1);
        expect(warned[0]).toContain("[audit] write-failed");
        expect(warned[0]).toContain("action=user.delete");
        expect(warned[0]).toContain("requestId=req-1");
        expect(warned[0]).toContain("reason=FirebaseError");
    });

    /**
     * `reason` is almost always the generic `Error` on a Firestore rejection. The gRPC
     * status is the part that says what to do about it: 7 is permission, 8 is quota,
     * 14 is unavailable.
     */
    it("logs the gRPC status the refused write came with", async () => {
        const PERMISSION_DENIED = 7;
        appendMock.mockRejectedValue(
            Object.assign(new Error("permission denied"), {
                code: PERMISSION_DENIED,
            })
        );

        await recordAuditEvent(deleteInput());

        expect(warned[0]).toContain("status=7");
    });

    it("leaves the status out when the failure carries no numeric code", async () => {
        appendMock.mockRejectedValue(
            Object.assign(new Error("boom"), { code: "FAILED_PRECONDITION" })
        );

        await recordAuditEvent(deleteInput());

        expect(warned[0]).not.toContain("status=");
    });

    it("never logs the failure message, which can carry a document path", async () => {
        appendMock.mockRejectedValue(
            new Error("permission denied on /auditEvent/secret-doc")
        );

        await recordAuditEvent(deleteInput());

        expect(warned[0]).not.toContain("secret-doc");
    });
});

describe("impersonationWindowKey", () => {
    const WINDOW_START = Date.parse("2026-09-16T14:00:00.000Z");
    const ONE_SECOND_IN = 1000;
    const ALMOST_THE_WHOLE_WINDOW = IMPERSONATION_WINDOW_MS - 1;

    it("gives the same key to two moments inside one window", () => {
        const first = impersonationWindowKey(
            "a",
            "b",
            WINDOW_START + ONE_SECOND_IN
        );
        const second = impersonationWindowKey(
            "a",
            "b",
            WINDOW_START + ALMOST_THE_WHOLE_WINDOW
        );

        expect(second.key).toBe(first.key);
    });

    it("moves to a new key once the window is over", () => {
        const first = impersonationWindowKey("a", "b", WINDOW_START);
        const next = impersonationWindowKey(
            "a",
            "b",
            WINDOW_START + IMPERSONATION_WINDOW_MS
        );

        expect(next.key).not.toBe(first.key);
    });

    it("separates the windows of two different subjects", () => {
        const onA = impersonationWindowKey("admin", "subject-a", WINDOW_START);
        const onB = impersonationWindowKey("admin", "subject-b", WINDOW_START);

        expect(onB.key).not.toBe(onA.key);
    });

    it("reports the instant the window ends", () => {
        const { startedAtMs } = impersonationWindowKey("a", "b", WINDOW_START);

        expect(startedAtMs + IMPERSONATION_WINDOW_MS).toBe(
            Date.parse("2026-09-16T14:15:00.000Z")
        );
    });
});

describe("recordImpersonationSession", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-16T14:03:00.000Z"));
    });

    it("writes one document for the window, whatever the request count", async () => {
        const REQUESTS_IN_THE_WINDOW = 20;
        for (let i = 0; i < REQUESTS_IN_THE_WINDOW; i += 1) {
            await recordImpersonationSession(impersonationInput());
        }

        expect(appendOnceMock).toHaveBeenCalledTimes(1);
    });

    it("stamps the end of the window on the event", async () => {
        await recordImpersonationSession(impersonationInput());

        expect(appendOnceMock.mock.calls[0]?.[1].windowEndsAt).toBe(
            "2026-09-16T14:15:00.000Z"
        );
    });

    it("records the subject both as the target and as who the actor stood in for", async () => {
        await recordImpersonationSession(impersonationInput());

        const written = appendOnceMock.mock.calls[0]?.[1];
        expect(written.action).toBe(AuditAction.IMPERSONATION_SESSION);
        expect(written.onBehalfOfUserId).toBe("p2");
        expect(written.targetUserId).toBe("p2");
        expect(written.targetLabel).toBe("subject@example.com");
        expect(written.involvedUserIds).toEqual(["p1", "p2"]);
    });

    it("writes again for a new subject in the same window", async () => {
        await recordImpersonationSession(impersonationInput());
        await recordImpersonationSession(
            impersonationInput({
                subjectUid: "auth-other",
                subjectUserId: "p3",
            })
        );

        expect(appendOnceMock).toHaveBeenCalledTimes(2);
    });

    it("writes again once the window has rolled over", async () => {
        await recordImpersonationSession(impersonationInput());
        vi.setSystemTime(new Date("2026-09-16T14:16:00.000Z"));
        await recordImpersonationSession(impersonationInput());

        expect(appendOnceMock).toHaveBeenCalledTimes(2);
    });

    it("looks the subject up only on the request that writes", async () => {
        await recordImpersonationSession(impersonationInput());
        await recordImpersonationSession(impersonationInput());

        expect(resolveLabelMock).toHaveBeenCalledTimes(1);
    });

    it("lets the request through when the trail write is refused", async () => {
        appendOnceMock.mockRejectedValue(
            Object.assign(new Error("unavailable"), { name: "FirebaseError" })
        );

        await expect(
            recordImpersonationSession(impersonationInput())
        ).resolves.toBeUndefined();
        expect(warned[0]).toContain("[audit] impersonation-write-failed");
        expect(warned[0]).toContain("reason=FirebaseError");
    });

    it("logs the gRPC status when the window write is refused", async () => {
        const RESOURCE_EXHAUSTED = 8;
        appendOnceMock.mockRejectedValue(
            Object.assign(new Error("quota exceeded"), {
                code: RESOURCE_EXHAUSTED,
            })
        );

        await recordImpersonationSession(impersonationInput());

        expect(warned[0]).toContain("status=8");
    });

    it("retries the window after a failed write instead of caching the miss", async () => {
        appendOnceMock.mockRejectedValueOnce(new Error("unavailable"));

        await recordImpersonationSession(impersonationInput());
        await recordImpersonationSession(impersonationInput());

        expect(appendOnceMock).toHaveBeenCalledTimes(2);
    });
});
