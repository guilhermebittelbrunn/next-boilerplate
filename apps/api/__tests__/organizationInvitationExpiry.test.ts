import { describe, expect, it, vi } from "vitest";

const { fakeDb, storedInvitation } = vi.hoisted(() => {
    const invitation: { data: Record<string, unknown> } = { data: {} };
    const query = { limit: () => query };

    const snapshot = () => ({
        id: "invitation-1",
        exists: true,
        ref: {},
        get: (field: string) => invitation.data[field],
        data: () => invitation.data,
    });

    return {
        storedInvitation: invitation,
        fakeDb: {
            collection: () => ({ where: () => query, doc: () => ({}) }),
            runTransaction: (
                run: (tx: { get: () => Promise<unknown> }) => Promise<unknown>
            ) => run({ get: () => Promise.resolve({ docs: [snapshot()] }) }),
        },
    };
});

vi.mock("server-only", () => ({}));
vi.mock("@/(shared)/infra/database", () => ({ default: fakeDb }));

const { organizationInvitationRepository } = await import(
    "@/(shared)/repositories/organization-invitation.repository"
);

const NOW = new Date("2026-06-01T12:00:00.000Z");

/**
 * The token is sent to another address on purpose: once the validity check lets the
 * invitation through, the acceptance stops at `email-mismatch` before reading anything else.
 */
function acceptWithExpiry(expiresAt: unknown) {
    storedInvitation.data = {
        organizationId: "organization-1",
        email: "invited@example.com",
        acceptedAt: null,
        deletedAt: null,
        expiresAt,
    };
    return organizationInvitationRepository.acceptByTokenHash({
        tokenHash: "hash",
        userId: "user-1",
        email: "someone-else@example.com",
        now: NOW,
    });
}

describe("invitation validity on acceptance", () => {
    it("lets a future expiry through", async () => {
        await expect(
            acceptWithExpiry(new Date("2026-06-02T12:00:00.000Z"))
        ).resolves.toEqual({ status: "email-mismatch" });
    });

    it("lets a future expiry stored as an ISO string through", async () => {
        await expect(
            acceptWithExpiry("2026-06-02T12:00:00.000Z")
        ).resolves.toEqual({ status: "email-mismatch" });
    });

    it("treats a past expiry as expired", async () => {
        await expect(
            acceptWithExpiry(new Date("2026-05-31T12:00:00.000Z"))
        ).resolves.toEqual({ status: "expired" });
    });

    it.each([
        ["an invalid Date", new Date(Number.NaN)],
        ["an unparseable string", "soon"],
        [
            "a Timestamp-like value with an invalid date",
            { toDate: () => new Date(Number.NaN) },
        ],
        ["a missing value", undefined],
    ])("treats %s as expired", async (_label, expiresAt) => {
        await expect(acceptWithExpiry(expiresAt)).resolves.toEqual({
            status: "expired",
        });
    });
});
