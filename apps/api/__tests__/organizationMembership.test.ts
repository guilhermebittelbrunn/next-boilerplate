import { UserType } from "@repo/sdk/src/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    findByUserIdMock,
    createOwnerMembershipMock,
    clearLegacyClaimMock,
    listByOrganizationMock,
    findOwnedByMock,
    claimUnscopedMock,
    logEventMock,
    findProfileByIdMock,
} = vi.hoisted(() => ({
    findByUserIdMock: vi.fn(),
    createOwnerMembershipMock: vi.fn(),
    clearLegacyClaimMock: vi.fn(),
    listByOrganizationMock: vi.fn(),
    findOwnedByMock: vi.fn(),
    claimUnscopedMock: vi.fn(),
    logEventMock: vi.fn(),
    findProfileByIdMock: vi.fn(),
}));

vi.mock("@/(shared)/repositories/organization-member.repository", () => ({
    organizationMemberRepository: {
        findByUserId: (...args: unknown[]) => findByUserIdMock(...args),
        createOwnerMembership: (...args: unknown[]) =>
            createOwnerMembershipMock(...args),
        clearLegacyClaim: (...args: unknown[]) => clearLegacyClaimMock(...args),
        listByOrganization: (...args: unknown[]) =>
            listByOrganizationMock(...args),
    },
}));

vi.mock("@/(shared)/repositories/organization.repository", () => ({
    organizationRepository: {
        findOwnedBy: (...args: unknown[]) => findOwnedByMock(...args),
    },
}));

vi.mock("@/(shared)/repositories/entity.repository", () => ({
    entityRepository: {
        claimUnscopedByUserId: (...args: unknown[]) =>
            claimUnscopedMock(...args),
    },
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findById: (...args: unknown[]) => findProfileByIdMock(...args),
    },
}));

vi.mock("@repo/shared/utils/helpers/log", () => ({
    logEvent: (...args: unknown[]) => logEventMock(...args),
}));

const {
    ensureOrganizationMembershipQuietly,
    ownsOrganizationWithMembers,
    resolveOrganizationMembership,
} = await import("@/(shared)/lib/organization-membership");

const PROFILE_ID = "profile-1";

function membership(overrides: Record<string, unknown> = {}) {
    return {
        id: PROFILE_ID,
        userId: PROFILE_ID,
        organizationId: "org-home",
        role: "owner",
        joinedAt: "2026-10-01T00:00:00.000Z",
        legacyClaimPending: false,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
        deletedAt: null,
        ...overrides,
    };
}

beforeEach(() => {
    for (const mock of [
        findByUserIdMock,
        createOwnerMembershipMock,
        clearLegacyClaimMock,
        listByOrganizationMock,
        findOwnedByMock,
        claimUnscopedMock,
        logEventMock,
        findProfileByIdMock,
    ]) {
        mock.mockReset();
    }
    findProfileByIdMock.mockImplementation((id: string) =>
        Promise.resolve({
            id,
            reference_id: `${id}-uid`,
            type: UserType.COMMON,
        })
    );
    findByUserIdMock.mockResolvedValue(null);
    findOwnedByMock.mockResolvedValue(null);
    createOwnerMembershipMock.mockImplementation(
        (input: { organizationId: string | null }) =>
            Promise.resolve(
                membership({
                    organizationId: input.organizationId ?? "org-new",
                    legacyClaimPending: true,
                })
            )
    );
    claimUnscopedMock.mockResolvedValue("finished");
    clearLegacyClaimMock.mockResolvedValue(undefined);
});

describe("resolveOrganizationMembership", () => {
    it("reads an existing membership by id and writes nothing", async () => {
        findByUserIdMock.mockResolvedValue(
            membership({ organizationId: "org-a", role: "member" })
        );

        const resolved = await resolveOrganizationMembership(PROFILE_ID);

        expect(resolved).toMatchObject({
            organizationId: "org-a",
            role: "member",
        });
        expect(findByUserIdMock).toHaveBeenCalledWith(PROFILE_ID);
        expect(createOwnerMembershipMock).not.toHaveBeenCalled();
        expect(claimUnscopedMock).not.toHaveBeenCalled();
    });

    it("creates a home organization for a profile that has none", async () => {
        const resolved = await resolveOrganizationMembership(PROFILE_ID);

        expect(createOwnerMembershipMock).toHaveBeenCalledWith({
            userId: PROFILE_ID,
            organizationId: null,
        });
        expect(resolved).toMatchObject({
            organizationId: "org-new",
            role: "owner",
        });
    });

    /** Someone who left or was removed returns to the organization they own. */
    it("rejoins the home organization instead of creating another", async () => {
        findOwnedByMock.mockResolvedValue({
            id: "org-home",
            ownerUserId: PROFILE_ID,
        });

        const resolved = await resolveOrganizationMembership(PROFILE_ID);

        expect(createOwnerMembershipMock).toHaveBeenCalledWith({
            userId: PROFILE_ID,
            organizationId: "org-home",
        });
        expect(resolved.organizationId).toBe("org-home");
    });

    it("reads what the concurrent request wrote when it loses the race", async () => {
        createOwnerMembershipMock.mockResolvedValue(null);
        findByUserIdMock
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(
                membership({ organizationId: "org-winner" })
            );

        const resolved = await resolveOrganizationMembership(PROFILE_ID);

        expect(resolved.organizationId).toBe("org-winner");
        expect(findByUserIdMock).toHaveBeenCalledTimes(2);
    });

    it("throws instead of inventing a scope when the membership vanished mid-race", async () => {
        createOwnerMembershipMock.mockResolvedValue(null);

        await expect(
            resolveOrganizationMembership(PROFILE_ID)
        ).rejects.toMatchObject({
            name: "OrganizationMembershipUnresolvedError",
        });
    });

    it("stamps the records from before organizations and clears the flag", async () => {
        await resolveOrganizationMembership(PROFILE_ID);

        expect(claimUnscopedMock).toHaveBeenCalledWith(PROFILE_ID, "org-new");
        expect(clearLegacyClaimMock).toHaveBeenCalledWith(PROFILE_ID);
    });

    it("keeps the flag and says so when the claim did not finish", async () => {
        claimUnscopedMock.mockResolvedValue("unfinished");

        await resolveOrganizationMembership(PROFILE_ID);

        expect(clearLegacyClaimMock).not.toHaveBeenCalled();
        expect(logEventMock).toHaveBeenCalledWith(
            "organization",
            "legacy-claim-unfinished"
        );
    });

    it("answers the request even when the claim fails, keeping the flag for the next one", async () => {
        claimUnscopedMock.mockRejectedValue(
            new TypeError("entity/abc owner@example.com")
        );

        const resolved = await resolveOrganizationMembership(PROFILE_ID);

        expect(resolved.organizationId).toBe("org-new");
        expect(clearLegacyClaimMock).not.toHaveBeenCalled();
        expect(logEventMock).toHaveBeenCalledWith(
            "organization",
            "legacy-claim-failed",
            { reason: "TypeError" }
        );
        expect(JSON.stringify(logEventMock.mock.calls)).not.toContain(
            "owner@example.com"
        );
    });

    /** A member must never pull their own older records into someone else's organization. */
    it("never claims records into an organization the person only joined", async () => {
        findByUserIdMock.mockResolvedValue(
            membership({
                organizationId: "org-someone-else",
                role: "member",
                legacyClaimPending: true,
            })
        );

        await resolveOrganizationMembership(PROFILE_ID);

        expect(claimUnscopedMock).not.toHaveBeenCalled();
    });
});

describe("ensureOrganizationMembershipQuietly", () => {
    it("swallows a failure so sign-up keeps the account", async () => {
        createOwnerMembershipMock.mockRejectedValue(new Error("unavailable"));

        await expect(
            ensureOrganizationMembershipQuietly(PROFILE_ID)
        ).resolves.toBeUndefined();
        expect(logEventMock).toHaveBeenCalledWith(
            "organization",
            "membership-create-failed",
            { reason: "Error" }
        );
    });
});

describe("ownsOrganizationWithMembers", () => {
    it("is false without a home organization", async () => {
        expect(await ownsOrganizationWithMembers(PROFILE_ID)).toBe(false);
    });

    it("is false for an owner alone in the organization", async () => {
        findOwnedByMock.mockResolvedValue({
            id: "org-home",
            ownerUserId: PROFILE_ID,
        });
        listByOrganizationMock.mockResolvedValue([membership()]);

        expect(await ownsOrganizationWithMembers(PROFILE_ID)).toBe(false);
        expect(findProfileByIdMock).not.toHaveBeenCalled();
    });

    it("is true when anyone else belongs to the home organization", async () => {
        findOwnedByMock.mockResolvedValue({
            id: "org-home",
            ownerUserId: PROFILE_ID,
        });
        listByOrganizationMock.mockResolvedValue([
            membership(),
            membership({
                id: "profile-2",
                userId: "profile-2",
                role: "member",
            }),
        ]);

        expect(await ownsOrganizationWithMembers(PROFILE_ID)).toBe(true);
        expect(listByOrganizationMock).toHaveBeenCalledWith("org-home");
        expect(findProfileByIdMock).toHaveBeenCalledWith("profile-2");
        expect(findProfileByIdMock).not.toHaveBeenCalledWith(PROFILE_ID);
    });

    it("is false when the only other member's profile was archived", async () => {
        findOwnedByMock.mockResolvedValue({
            id: "org-home",
            ownerUserId: PROFILE_ID,
        });
        listByOrganizationMock.mockResolvedValue([
            membership(),
            membership({
                id: "profile-archived",
                userId: "profile-archived",
                role: "member",
            }),
        ]);
        findProfileByIdMock.mockResolvedValue(null);

        expect(await ownsOrganizationWithMembers(PROFILE_ID)).toBe(false);
        expect(findProfileByIdMock).toHaveBeenCalledWith("profile-archived");
    });

    it("is true when a live member sits next to an archived one", async () => {
        findOwnedByMock.mockResolvedValue({
            id: "org-home",
            ownerUserId: PROFILE_ID,
        });
        listByOrganizationMock.mockResolvedValue([
            membership(),
            membership({
                id: "profile-archived",
                userId: "profile-archived",
                role: "member",
            }),
            membership({
                id: "profile-2",
                userId: "profile-2",
                role: "member",
            }),
        ]);
        findProfileByIdMock.mockImplementation((id: string) =>
            Promise.resolve(
                id === "profile-archived"
                    ? null
                    : { id, reference_id: `${id}-uid`, type: UserType.COMMON }
            )
        );

        expect(await ownsOrganizationWithMembers(PROFILE_ID)).toBe(true);
    });

    it("surfaces a failure to read a member's profile", async () => {
        findOwnedByMock.mockResolvedValue({
            id: "org-home",
            ownerUserId: PROFILE_ID,
        });
        listByOrganizationMock.mockResolvedValue([
            membership(),
            membership({
                id: "profile-2",
                userId: "profile-2",
                role: "member",
            }),
        ]);
        const unavailable = new Error("unavailable");
        findProfileByIdMock.mockRejectedValue(unavailable);

        await expect(ownsOrganizationWithMembers(PROFILE_ID)).rejects.toBe(
            unavailable
        );
    });
});
