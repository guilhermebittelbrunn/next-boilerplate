import { UserType } from "@repo/sdk/src/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findProfileByIdMock, getUsersMock } = vi.hoisted(() => ({
    findProfileByIdMock: vi.fn(),
    getUsersMock: vi.fn(),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findById: (...args: unknown[]) => findProfileByIdMock(...args),
    },
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({
        getUsers: (...args: unknown[]) => getUsersMock(...args),
    }),
}));

const { describeOrganizationMembers } = await import(
    "@/(shared)/lib/organization-member-profiles"
);

const ORGANIZATION_ID = "org-1";
const AUTH_LOOKUP_LIMIT = 100;
const MEMBER_COUNT = 150;
const ID_DIGITS = 3;
const FIRST_JOINED_AT_MS = Date.parse("2026-10-01T00:00:00.000Z");
const MS_PER_MINUTE = 60_000;

function membership(index: number) {
    const userId = `member-${String(index).padStart(ID_DIGITS, "0")}`;
    const joinedAt = new Date(
        FIRST_JOINED_AT_MS + index * MS_PER_MINUTE
    ).toISOString();
    return {
        id: userId,
        userId,
        organizationId: ORGANIZATION_ID,
        role: index === 0 ? ("owner" as const) : ("member" as const),
        joinedAt,
        legacyClaimPending: false,
        createdAt: joinedAt,
        updatedAt: joinedAt,
        deletedAt: null,
    };
}

beforeEach(() => {
    findProfileByIdMock.mockReset();
    getUsersMock.mockReset();
    findProfileByIdMock.mockImplementation((id: string) =>
        Promise.resolve({
            id,
            reference_id: `${id}-uid`,
            type: UserType.COMMON,
        })
    );
    getUsersMock.mockImplementation((identifiers: { uid: string }[]) =>
        Promise.resolve({
            users: identifiers.map(({ uid }) => ({
                uid,
                email: `${uid}@example.com`,
                displayName: null,
            })),
        })
    );
});

describe("describeOrganizationMembers", () => {
    it("asks Auth at most 100 accounts per call and names every member past the first batch", async () => {
        const memberships = Array.from({ length: MEMBER_COUNT }, (_, index) =>
            membership(index)
        );

        const members = await describeOrganizationMembers(memberships);

        const batchSizes = getUsersMock.mock.calls.map(
            ([identifiers]) => (identifiers as unknown[]).length
        );
        expect(batchSizes).toEqual([
            AUTH_LOOKUP_LIMIT,
            MEMBER_COUNT - AUTH_LOOKUP_LIMIT,
        ]);
        expect(members).toHaveLength(MEMBER_COUNT);
        expect(members.every((member) => member.email !== null)).toBe(true);
        expect(members.at(-1)).toMatchObject({
            userId: "member-149",
            email: "member-149-uid@example.com",
        });
        expect(members[0]).toMatchObject({
            userId: "member-000",
            role: "owner",
        });
    });

    it("does not call Auth when no member has an account to look up", async () => {
        findProfileByIdMock.mockResolvedValue(null);

        const members = await describeOrganizationMembers([membership(1)]);

        expect(getUsersMock).not.toHaveBeenCalled();
        expect(members).toEqual([
            expect.objectContaining({
                userId: "member-001",
                email: null,
                displayName: null,
            }),
        ]);
    });
});
