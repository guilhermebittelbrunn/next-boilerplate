import { UserType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    identitySignUpMock,
    findByReferenceIdMock,
    createMock,
    getUserMock,
    deleteUserMock,
} = vi.hoisted(() => ({
    identitySignUpMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    createMock: vi.fn(),
    getUserMock: vi.fn(),
    deleteUserMock: vi.fn(),
}));

vi.mock("@/(shared)/lib/firebase-identity-toolkit", () => ({
    IdentityToolkitError: class extends Error {},
    identitySignUp: (...args: unknown[]) => identitySignUpMock(...args),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
        create: (...args: unknown[]) => createMock(...args),
    },
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({
        getUser: (...args: unknown[]) => getUserMock(...args),
        deleteUser: (...args: unknown[]) => deleteUserMock(...args),
    }),
    getCurrentUser: vi.fn(),
}));

const { POST } = await import("@/app/(routes)/auth/sign-up/route");

const UID = "new-uid-1";
const CREATED = 201;

function signUpRequest() {
    return new Request("http://localhost:3002/auth/sign-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            email: "qa-onboarding@example.com",
            password: "irrelevant",
        }),
    });
}

describe("POST /auth/sign-up", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        identitySignUpMock.mockResolvedValue({
            localId: UID,
            idToken: "id-token",
            refreshToken: "refresh",
            expiresIn: "3600",
        });
        createMock.mockImplementation((data: Record<string, unknown>) =>
            Promise.resolve({ id: "profile-1", ...data })
        );
        getUserMock.mockResolvedValue({
            uid: UID,
            email: "qa-onboarding@example.com",
            emailVerified: false,
            displayName: null,
            photoURL: null,
            phoneNumber: null,
            disabled: false,
            metadata: {},
            providerData: [],
            customClaims: null,
            tokensValidAfterTime: undefined,
        });
        findByReferenceIdMock.mockResolvedValue({
            id: "profile-1",
            reference_id: UID,
            type: UserType.COMMON,
        });
    });

    it("creates the profile with the onboarding pending at the first step", async () => {
        const response = await POST(signUpRequest());

        expect(response.status).toBe(CREATED);
        expect(createMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenCalledWith({
            reference_id: UID,
            type: UserType.COMMON,
            onboarding: { step: "profile", completedAt: null },
        });
    });

    it("rolls the Auth account back when the profile cannot be created", async () => {
        createMock.mockRejectedValue(new Error("firestore unavailable"));

        const response = await POST(signUpRequest());

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(deleteUserMock).toHaveBeenCalledWith(UID);
    });
});
