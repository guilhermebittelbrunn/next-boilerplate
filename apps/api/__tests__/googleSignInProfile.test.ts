import { UserType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    signInWithGoogleMock,
    findByReferenceIdMock,
    hasArchivedProfileMock,
    createMock,
    getUserMock,
    emitNotificationMock,
} = vi.hoisted(() => ({
    signInWithGoogleMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    hasArchivedProfileMock: vi.fn(),
    createMock: vi.fn(),
    getUserMock: vi.fn(),
    emitNotificationMock: vi.fn(),
}));

// The organization resolver reaches Firestore through the repositories; it is not what
// this file is about.
vi.mock("@/(shared)/lib/organization-membership", () => ({
    ensureOrganizationMembershipQuietly: vi.fn(),
}));

vi.mock("@/(shared)/lib/notifications", () => ({
    emitNotificationQuietly: (...args: unknown[]) =>
        emitNotificationMock(...args),
}));

vi.mock("@/(shared)/lib/firebase-identity-toolkit", () => ({
    IdentityToolkitError: class extends Error {},
    identitySignInWithGoogleIdToken: (...args: unknown[]) =>
        signInWithGoogleMock(...args),
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

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({
        getUser: (...a: unknown[]) => getUserMock(...a),
        updateUser: vi.fn(),
    }),
    getCurrentUser: vi.fn(),
    revokeUserSessions: vi.fn(),
}));

const UID = "google-uid-1";

function googleRequest() {
    return new Request("http://localhost:3002/auth/sign-in/google", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken: "google-id-token" }),
    });
}

function existingProfile() {
    return {
        id: "profile-1",
        reference_id: UID,
        type: UserType.COMMON,
        createdAt: "2026-01-01T00:00:00.000Z",
        deletedAt: null,
    };
}

describe("POST /auth/sign-in/google", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hasArchivedProfileMock.mockResolvedValue(false);
        signInWithGoogleMock.mockResolvedValue({
            localId: UID,
            idToken: "session-id-token",
            refreshToken: "refresh",
            expiresIn: "3600",
        });
        getUserMock.mockResolvedValue({
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
        });
    });

    it("does not create a second profile when the account already has one", async () => {
        findByReferenceIdMock.mockResolvedValue(existingProfile());

        const { POST } = await import(
            "@/app/(routes)/auth/sign-in/google/route"
        );
        const response = await POST(googleRequest());

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(createMock).not.toHaveBeenCalled();
        expect(emitNotificationMock).not.toHaveBeenCalled();
    });

    it("creates the profile exactly once when the account has none", async () => {
        findByReferenceIdMock.mockResolvedValue(null);
        createMock.mockResolvedValue(existingProfile());

        const { POST } = await import(
            "@/app/(routes)/auth/sign-in/google/route"
        );
        const response = await POST(googleRequest());

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(createMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenCalledWith(
            expect.objectContaining({
                reference_id: UID,
                type: UserType.COMMON,
            })
        );
        expect(emitNotificationMock).toHaveBeenCalledTimes(1);
        expect(emitNotificationMock).toHaveBeenCalledWith(
            expect.objectContaining({ userId: "profile-1", type: "welcome" })
        );
    });

    it("creates the profile with the onboarding pending at the first step", async () => {
        findByReferenceIdMock.mockResolvedValue(null);
        createMock.mockResolvedValue(existingProfile());

        const { POST } = await import(
            "@/app/(routes)/auth/sign-in/google/route"
        );
        await POST(googleRequest());

        expect(createMock).toHaveBeenCalledWith(
            expect.objectContaining({
                onboarding: { step: "profile", completedAt: null },
            })
        );
    });

    it("answers 404 without a session when the account's only profile is archived", async () => {
        findByReferenceIdMock.mockResolvedValue(null);
        hasArchivedProfileMock.mockResolvedValue(true);

        const { POST } = await import(
            "@/app/(routes)/auth/sign-in/google/route"
        );
        const response = await POST(googleRequest());

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        const body = await response.json();
        expect(body).toEqual({ error: { code: "USERS_NOT_FOUND" } });
        expect(body).not.toHaveProperty("session");
        expect(createMock).not.toHaveBeenCalled();
    });
});
