import { UserType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
} from "@repo/shared/utils/helpers/passwordPolicy";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createUserMock, createMock, deleteUserMock } = vi.hoisted(() => ({
    createUserMock: vi.fn(),
    createMock: vi.fn(),
    deleteUserMock: vi.fn(),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: vi.fn(),
        create: (...args: unknown[]) => createMock(...args),
    },
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({
        createUser: (...args: unknown[]) => createUserMock(...args),
        deleteUser: (...args: unknown[]) => deleteUserMock(...args),
    }),
    getCurrentUser: vi.fn(),
}));

const { POST } = await import("@/app/(routes)/auth/sign-up/route");

const UID = "new-uid-1";
const EMAIL = "qa-onboarding@example.com";
const ACCEPTED_PASSWORD = "a".repeat(PASSWORD_MIN_LENGTH);

function signUpRequest(
    body: unknown = { email: EMAIL, password: ACCEPTED_PASSWORD }
) {
    return new Request("http://localhost:3002/auth/sign-up", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
    });
}

function adminError(code: string) {
    return Object.assign(new Error(code), { code });
}

describe("POST /auth/sign-up", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        createUserMock.mockResolvedValue({ uid: UID });
        createMock.mockImplementation((data: Record<string, unknown>) =>
            Promise.resolve({ id: "profile-1", ...data })
        );
        deleteUserMock.mockResolvedValue(undefined);
    });

    it("creates the account with the Admin SDK and answers without session data", async () => {
        const response = await POST(signUpRequest());

        expect(response.status).toBe(HTTP_STATUS.CREATED);
        expect(await response.json()).toEqual({ data: { created: true } });
        expect(createUserMock).toHaveBeenCalledWith({
            email: EMAIL,
            password: ACCEPTED_PASSWORD,
        });
    });

    it("creates the profile with the onboarding pending at the first step", async () => {
        await POST(signUpRequest());

        expect(createMock).toHaveBeenCalledTimes(1);
        expect(createMock).toHaveBeenCalledWith({
            reference_id: UID,
            type: UserType.COMMON,
            onboarding: { step: "profile", completedAt: null },
        });
    });

    it("rolls the Auth account back when the profile cannot be created", async () => {
        createMock.mockRejectedValue(new Error("firestore unavailable"));
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
            // silence the expected log line
        });

        const response = await POST(signUpRequest());

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(await response.json()).toEqual({
            error: { code: "USERS_PROFILE_CREATE_FAILED" },
        });
        expect(deleteUserMock).toHaveBeenCalledWith(UID);
        warnSpy.mockRestore();
    });

    it("still answers with a code when the rollback itself fails", async () => {
        createMock.mockRejectedValue(new Error("firestore unavailable"));
        deleteUserMock.mockRejectedValue(new Error("auth unavailable"));
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
            // silence the expected log lines
        });

        const response = await POST(signUpRequest());

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(await response.json()).toEqual({
            error: { code: "USERS_PROFILE_CREATE_FAILED" },
        });
        const logged = warnSpy.mock.calls.flat().join(" ");
        expect(logged).toContain("[auth] sign-up-rollback-failed");
        expect(logged).toContain("reason=Error");
        expect(logged).not.toContain(EMAIL);
        warnSpy.mockRestore();
    });

    it.each([
        ["a password one character short", "a".repeat(PASSWORD_MIN_LENGTH - 1)],
        ["a password of spaces only", " ".repeat(PASSWORD_MIN_LENGTH - 1)],
    ])("refuses %s without creating the account", async (_label, password) => {
        const response = await POST(signUpRequest({ email: EMAIL, password }));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await response.json()).toEqual({
            error: { code: "AUTH_PASSWORD_TOO_SHORT" },
        });
        expect(createUserMock).not.toHaveBeenCalled();
    });

    it("counts spaces as characters instead of trimming them", async () => {
        const password = " ".repeat(PASSWORD_MIN_LENGTH);

        const response = await POST(signUpRequest({ email: EMAIL, password }));

        expect(response.status).toBe(HTTP_STATUS.CREATED);
        expect(createUserMock).toHaveBeenCalledWith({ email: EMAIL, password });
    });

    it("reports the short password even when the email is invalid too", async () => {
        const response = await POST(
            signUpRequest({ email: "not-an-email", password: "short" })
        );

        expect(await response.json()).toEqual({
            error: { code: "AUTH_PASSWORD_TOO_SHORT" },
        });
    });

    it.each([
        [
            "an invalid email",
            { email: "not-an-email", password: ACCEPTED_PASSWORD },
        ],
        [
            "a password past the ceiling",
            { email: EMAIL, password: "a".repeat(PASSWORD_MAX_LENGTH + 1) },
        ],
        ["a missing password", { email: EMAIL }],
        ["a non-string password", { email: EMAIL, password: 12_345_678 }],
    ])("refuses %s as a validation failure", async (_label, body) => {
        const response = await POST(signUpRequest(body));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await response.json()).toEqual({
            error: { code: "VALIDATION_FAILED" },
        });
        expect(createUserMock).not.toHaveBeenCalled();
    });

    it("refuses a body that is not JSON", async () => {
        const response = await POST(signUpRequest("{not json"));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await response.json()).toEqual({
            error: { code: "VALIDATION_FAILED" },
        });
        expect(createUserMock).not.toHaveBeenCalled();
    });

    it.each([
        [
            "auth/email-already-exists",
            "USERS_AUTH_EMAIL_ALREADY_IN_USE",
            HTTP_STATUS.BAD_REQUEST,
        ],
        [
            "auth/invalid-email",
            "USERS_AUTH_INVALID_EMAIL",
            HTTP_STATUS.BAD_REQUEST,
        ],
        [
            "auth/invalid-password",
            "USERS_AUTH_WEAK_PASSWORD",
            HTTP_STATUS.BAD_REQUEST,
        ],
        [
            "auth/quota-exceeded",
            "USERS_AUTH_RATE_LIMITED",
            HTTP_STATUS.TOO_MANY_REQUESTS,
        ],
    ])("translates %s into %s", async (adminCode, code, status) => {
        createUserMock.mockRejectedValue(adminError(adminCode));

        const response = await POST(signUpRequest());

        expect(response.status).toBe(status);
        expect(await response.json()).toEqual({ error: { code } });
        expect(createMock).not.toHaveBeenCalled();
    });

    it("answers an unexpected Admin SDK failure with a code and logs no address", async () => {
        createUserMock.mockRejectedValue(adminError("auth/internal-error"));
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
            // captured below
        });

        const response = await POST(signUpRequest());

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(await response.json()).toEqual({
            error: { code: "USERS_AUTH_SIGN_UP_FAILED" },
        });
        const logged = warnSpy.mock.calls.flat().join(" ");
        expect(logged).toContain("[auth] sign-up-failed");
        expect(logged).toContain("reason=auth/internal-error");
        expect(logged).not.toContain(EMAIL);
        expect(logged).not.toContain(ACCEPTED_PASSWORD);
        warnSpy.mockRestore();
    });
});
