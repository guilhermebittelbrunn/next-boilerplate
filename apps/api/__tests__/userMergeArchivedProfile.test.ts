import { UserType } from "@repo/sdk/src/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    getUserMock,
    getCurrentUserMock,
    updateUserMock,
    revokeUserSessionsMock,
    findByReferenceIdMock,
    hasArchivedProfileMock,
    createMock,
    logEventMock,
} = vi.hoisted(() => ({
    getUserMock: vi.fn(),
    getCurrentUserMock: vi.fn(),
    updateUserMock: vi.fn(),
    revokeUserSessionsMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    hasArchivedProfileMock: vi.fn(),
    createMock: vi.fn(),
    logEventMock: vi.fn(),
}));

vi.mock("@/(shared)/lib/notifications", () => ({
    emitNotificationQuietly: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({
        getUser: (...args: unknown[]) => getUserMock(...args),
        updateUser: (...args: unknown[]) => updateUserMock(...args),
    }),
    getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
    revokeUserSessions: (...args: unknown[]) => revokeUserSessionsMock(...args),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
        hasArchivedProfile: (...args: unknown[]) =>
            hasArchivedProfileMock(...args),
        create: (...args: unknown[]) => createMock(...args),
    },
}));

vi.mock("@repo/shared/utils/helpers/log", () => ({
    logEvent: (...args: unknown[]) => logEventMock(...args),
}));

const { getMergedUserByUid, getMergedUserFromIdToken } = await import(
    "@/(shared)/lib/user-merge"
);

const UID = "archived-uid";

function authRecord() {
    return {
        uid: UID,
        email: "person@example.com",
        emailVerified: true,
        displayName: null,
        photoURL: null,
        phoneNumber: null,
        disabled: false,
        metadata: {},
        providerData: [],
        customClaims: null,
        tokensValidAfterTime: undefined,
    };
}

function liveProfile() {
    return {
        id: "profile-1",
        reference_id: UID,
        type: UserType.COMMON,
        createdAt: "2026-01-01T00:00:00.000Z",
        deletedAt: null,
    };
}

beforeEach(() => {
    for (const mock of [
        getUserMock,
        getCurrentUserMock,
        updateUserMock,
        revokeUserSessionsMock,
        findByReferenceIdMock,
        hasArchivedProfileMock,
        createMock,
        logEventMock,
    ]) {
        mock.mockReset();
    }

    getUserMock.mockResolvedValue(authRecord());
    getCurrentUserMock.mockResolvedValue(authRecord());
    updateUserMock.mockResolvedValue({});
    revokeUserSessionsMock.mockResolvedValue(undefined);
    findByReferenceIdMock.mockResolvedValue(null);
    hasArchivedProfileMock.mockResolvedValue(false);
    createMock.mockResolvedValue(liveProfile());
});

describe("getMergedUserByUid never recreates an archived profile", () => {
    it("merges the live profile without looking for an archived one", async () => {
        findByReferenceIdMock.mockResolvedValue(liveProfile());

        const merged = await getMergedUserByUid(UID);

        expect(merged).toMatchObject({ uid: UID, id: "profile-1" });
        expect(hasArchivedProfileMock).not.toHaveBeenCalled();
        expect(createMock).not.toHaveBeenCalled();
    });

    it("returns null and locks the account out when its only profile is archived", async () => {
        hasArchivedProfileMock.mockResolvedValue(true);

        const merged = await getMergedUserByUid(UID);

        expect(merged).toBeNull();
        expect(createMock).not.toHaveBeenCalled();
        expect(updateUserMock).toHaveBeenCalledWith(UID, { disabled: true });
        expect(revokeUserSessionsMock).toHaveBeenCalledWith(UID);
    });

    it("still creates the COMMON profile on an account's first sign-in", async () => {
        const merged = await getMergedUserByUid(UID);

        expect(merged).toMatchObject({ uid: UID, id: "profile-1" });
        expect(createMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenCalledWith(
            expect.objectContaining({
                reference_id: UID,
                type: UserType.COMMON,
            })
        );
        expect(updateUserMock).not.toHaveBeenCalled();
    });

    it("returns null without throwing when disabling the archived account fails", async () => {
        hasArchivedProfileMock.mockResolvedValue(true);
        updateUserMock.mockRejectedValue({
            code: "auth/internal-error",
            message: "provider-detail",
        });

        const merged = await getMergedUserByUid(UID);

        expect(merged).toBeNull();
        expect(createMock).not.toHaveBeenCalled();
        expect(logEventMock).toHaveBeenCalledWith(
            "auth",
            "archived-account-lockout-failed",
            { reason: "auth/internal-error" }
        );
        expect(JSON.stringify(logEventMock.mock.calls)).not.toContain(
            "provider-detail"
        );
    });

    it("returns null without reading Firestore when the Auth account does not exist", async () => {
        getUserMock.mockRejectedValue({ code: "auth/user-not-found" });

        const merged = await getMergedUserByUid(UID);

        expect(merged).toBeNull();
        expect(findByReferenceIdMock).not.toHaveBeenCalled();
        expect(hasArchivedProfileMock).not.toHaveBeenCalled();
    });
});

describe("getMergedUserFromIdToken never recreates an archived profile", () => {
    it("returns null for a valid token whose only profile is archived", async () => {
        hasArchivedProfileMock.mockResolvedValue(true);

        const merged = await getMergedUserFromIdToken("id-token");

        expect(merged).toBeNull();
        expect(createMock).not.toHaveBeenCalled();
        expect(updateUserMock).toHaveBeenCalledWith(UID, { disabled: true });
    });
});
