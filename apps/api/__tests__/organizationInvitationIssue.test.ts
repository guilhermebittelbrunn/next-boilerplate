import { beforeEach, describe, expect, it, vi } from "vitest";

const { fakeDb, stored } = vi.hoisted(() => {
    const state: {
        current: Record<string, unknown> | undefined;
        others: Record<string, unknown>[];
    } = { current: undefined, others: [] };

    const invitationRef = { path: "organizationInvitation/invitation-1" };
    const organizationQuery = { path: "organizationInvitation?organizationId" };

    return {
        stored: state,
        fakeDb: {
            collection: () => ({
                doc: () => invitationRef,
                where: () => organizationQuery,
            }),
            runTransaction: (
                run: (tx: {
                    get: (target: unknown) => Promise<unknown>;
                    set: () => void;
                }) => Promise<unknown>
            ) =>
                run({
                    get: (target) =>
                        Promise.resolve(
                            target === invitationRef
                                ? { data: () => state.current }
                                : {
                                      docs: state.others.map((data, index) => ({
                                          id: `other-${index}`,
                                          data: () => data,
                                      })),
                                  }
                        ),
                    set: vi.fn(),
                }),
        },
    };
});

vi.mock("server-only", () => ({}));
vi.mock("@/(shared)/infra/database", () => ({ default: fakeDb }));

const { organizationInvitationRepository } = await import(
    "@/(shared)/repositories/organization-invitation.repository"
);

const NOW = new Date("2026-06-01T12:00:00.000Z");
const FUTURE = new Date("2026-06-08T12:00:00.000Z");

function openInvitation(expiresAt: unknown, lastSentAt: unknown = NOW) {
    return {
        organizationId: "organization-1",
        email: "pending@example.com",
        acceptedAt: null,
        deletedAt: null,
        expiresAt,
        lastSentAt,
    };
}

function issue(pendingMax = 1) {
    return organizationInvitationRepository.issue({
        id: "invitation-1",
        organizationId: "organization-1",
        email: "invited@example.com",
        inviterEmail: "owner@example.com",
        invitedByUserId: "user-1",
        tokenHash: "hash",
        now: NOW,
        expiresAt: FUTURE,
        resendNotBefore: new Date("2026-06-01T11:00:00.000Z"),
        pendingMax,
    });
}

beforeEach(() => {
    stored.current = undefined;
    stored.others = [];
});

describe("pending invitation ceiling", () => {
    it("counts another invitation with a future expiry against the ceiling", async () => {
        stored.others = [openInvitation(FUTURE)];

        await expect(issue()).resolves.toEqual({ status: "limit-reached" });
    });

    it("counts a future expiry stored as an ISO string against the ceiling", async () => {
        stored.others = [openInvitation("2026-06-08T12:00:00.000Z")];

        await expect(issue()).resolves.toEqual({ status: "limit-reached" });
    });

    it.each([
        ["an invalid Date", new Date(Number.NaN)],
        ["an unparseable string", "soon"],
        [
            "a Timestamp-like value with an invalid date",
            { toDate: () => new Date(Number.NaN) },
        ],
        ["a missing value", undefined],
    ])(
        "does not count an invitation whose expiry is %s",
        async (_label, expiresAt) => {
            stored.others = [openInvitation(expiresAt)];

            await expect(issue()).resolves.toMatchObject({ status: "issued" });
        }
    );
});

describe("resending the same invitation", () => {
    it("refuses to resend an open invitation sent moments ago", async () => {
        stored.current = openInvitation(FUTURE);

        await expect(issue()).resolves.toEqual({ status: "recently-sent" });
    });

    it("resends when the stored expiry cannot be read", async () => {
        stored.current = openInvitation("soon");

        await expect(issue()).resolves.toMatchObject({ status: "issued" });
    });

    it("resends when the last sending instant cannot be read", async () => {
        stored.current = openInvitation(FUTURE, "yesterday-ish");

        await expect(issue()).resolves.toMatchObject({ status: "issued" });
    });
});
