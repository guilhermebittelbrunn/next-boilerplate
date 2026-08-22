import { UserType } from "@repo/sdk/src/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock } = vi.hoisted(() => ({ getUserMock: vi.fn() }));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({ getUser: getUserMock }),
    getCurrentUser: vi.fn(),
}));

vi.mock("@/(shared)/infra/database", () => ({ default: {} }));

const { userRepository } = await import(
    "@/(shared)/repositories/user.repository"
);

const ADMIN_PROFILE = {
    id: "p1",
    reference_id: "auth-admin",
    type: UserType.ADMIN,
};
const ALICE_PROFILE = {
    id: "p2",
    reference_id: "auth-alice",
    type: UserType.COMMON,
};
const GHOST_PROFILE = {
    id: "p3",
    reference_id: "auth-ghost",
    type: UserType.COMMON,
};

function authRecord(uid: string, email: string) {
    return {
        uid,
        email,
        emailVerified: true,
        displayName: null,
        photoURL: null,
        phoneNumber: null,
        disabled: false,
        metadata: {
            creationTime: "Mon, 01 Jan 2024 00:00:00 GMT",
            lastSignInTime: null,
            lastRefreshTime: null,
        },
        providerData: [],
        customClaims: null,
        tokensValidAfterTime: undefined,
    };
}

function givenProfiles(profiles: unknown[]) {
    vi.spyOn(userRepository, "findAll").mockResolvedValue(
        // biome-ignore lint/suspicious/noExplicitAny: raw Firestore rows
        profiles as any
    );
}

beforeEach(() => {
    vi.restoreAllMocks();
    getUserMock.mockReset();
    getUserMock.mockImplementation((uid: string) =>
        Promise.resolve(authRecord(uid, `${uid}@example.com`))
    );
});

describe("userRepository.list", () => {
    it("merges every profile with its auth account", async () => {
        givenProfiles([ADMIN_PROFILE, ALICE_PROFILE]);

        const users = await userRepository.list();

        expect(users).toHaveLength(2);
        expect(users.map((user) => user.reference_id)).toEqual([
            "auth-admin",
            "auth-alice",
        ]);
    });

    it("keeps only the requested type", async () => {
        givenProfiles([ADMIN_PROFILE, ALICE_PROFILE]);

        const users = await userRepository.list({ type: UserType.COMMON });

        expect(users.map((user) => user.reference_id)).toEqual(["auth-alice"]);
        expect(getUserMock).toHaveBeenCalledTimes(1);
    });

    it("omits a profile whose auth account was deleted outside the app", async () => {
        givenProfiles([ALICE_PROFILE, GHOST_PROFILE]);
        getUserMock.mockImplementation((uid: string) =>
            uid === GHOST_PROFILE.reference_id
                ? Promise.reject(
                      Object.assign(new Error("no user"), {
                          code: "auth/user-not-found",
                      })
                  )
                : Promise.resolve(authRecord(uid, `${uid}@example.com`))
        );

        const users = await userRepository.list();

        expect(users.map((user) => user.reference_id)).toEqual(["auth-alice"]);
    });

    it("propagates a transient auth failure instead of hiding records", async () => {
        givenProfiles([ALICE_PROFILE, GHOST_PROFILE]);
        getUserMock.mockRejectedValue(
            Object.assign(new Error("quota exceeded"), {
                code: "auth/internal-error",
            })
        );

        await expect(userRepository.list()).rejects.toThrow("quota exceeded");
    });
});
