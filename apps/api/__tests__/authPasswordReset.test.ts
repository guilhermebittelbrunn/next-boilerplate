import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    canSendAuthActionLinkMock,
    buildAuthActionLinkMock,
    sendEmailMock,
    identityResetPasswordMock,
    getUserByEmailMock,
    revokeUserSessionsMock,
} = vi.hoisted(() => ({
    canSendAuthActionLinkMock: vi.fn(),
    buildAuthActionLinkMock: vi.fn(),
    sendEmailMock: vi.fn(),
    identityResetPasswordMock: vi.fn(),
    getUserByEmailMock: vi.fn(),
    revokeUserSessionsMock: vi.fn(),
}));

class FakeToolkitError extends Error {}

vi.mock("@/(shared)/lib/auth-action-links", () => ({
    canSendAuthActionLink: () => canSendAuthActionLinkMock(),
    buildAuthActionLink: (...args: unknown[]) =>
        buildAuthActionLinkMock(...args),
}));

vi.mock("@repo/email", () => ({
    sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

vi.mock("@repo/email/templates/action-link", () => ({
    actionLinkEmail: { id: "action-link" },
}));

vi.mock("@/(shared)/lib/firebase-identity-toolkit", () => ({
    IdentityToolkitError: FakeToolkitError,
    identityResetPassword: (...args: unknown[]) =>
        identityResetPasswordMock(...args),
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({
        getUserByEmail: (...args: unknown[]) => getUserByEmailMock(...args),
    }),
    revokeUserSessions: (...args: unknown[]) => revokeUserSessionsMock(...args),
}));

/**
 * Captured instead of executed, so a test can assert on what the handler had *not*
 * yet done by the time it answered — which is the whole point of the deferral.
 */
const deferredWork: Array<() => Promise<void> | void> = [];

vi.mock("next/server", () => ({
    after: (callback: () => Promise<void> | void) => {
        deferredWork.push(callback);
    },
}));

async function flushDeferredWork() {
    const pending = deferredWork.splice(0, deferredWork.length);
    for (const callback of pending) {
        await callback();
    }
}

const KNOWN_EMAIL = "known@example.com";
const UNKNOWN_EMAIL = "nobody@example.com";
const ACTION_URL = "https://app.example.com/pt-br/reset-password?oobCode=code";
const LONGEST_ACCEPTED_OOB_CODE = 2048;
const OOB_CODE_PAST_THE_CEILING = LONGEST_ACCEPTED_OOB_CODE + 1;
const SHORTEST_ACCEPTED_PASSWORD = 6;
const LONGEST_ACCEPTED_PASSWORD = 1024;
const PASSWORD_PAST_THE_CEILING = LONGEST_ACCEPTED_PASSWORD + 1;

function requestFor(url: string, body: unknown) {
    return new Request(`http://localhost:3002${url}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

async function postResetRequest(body: unknown) {
    const { POST } = await import(
        "@/app/(routes)/auth/password/reset-request/route"
    );
    return POST(requestFor("/auth/password/reset-request", body));
}

async function postResetConfirm(body: unknown) {
    const { POST } = await import("@/app/(routes)/auth/password/reset/route");
    return POST(requestFor("/auth/password/reset", body));
}

beforeEach(() => {
    vi.clearAllMocks();
    deferredWork.length = 0;
    canSendAuthActionLinkMock.mockReturnValue(true);
    sendEmailMock.mockResolvedValue({ sent: true, id: "mail-1" });
    buildAuthActionLinkMock.mockImplementation((_kind, email: string) =>
        Promise.resolve(email === KNOWN_EMAIL ? ACTION_URL : null)
    );
    identityResetPasswordMock.mockResolvedValue({
        email: KNOWN_EMAIL,
        requestType: "PASSWORD_RESET",
    });
    getUserByEmailMock.mockResolvedValue({ uid: "uid-1" });
    revokeUserSessionsMock.mockResolvedValue(undefined);
});

describe("POST /auth/password/reset-request", () => {
    it("refuses before any account lookup when the fork cannot send mail", async () => {
        canSendAuthActionLinkMock.mockReturnValue(false);

        const response = await postResetRequest({ email: KNOWN_EMAIL });

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await response.json()).toEqual({
            error: { code: "EMAIL_NOT_CONFIGURED" },
        });
        expect(buildAuthActionLinkMock).not.toHaveBeenCalled();
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("answers a known and an unknown address identically", async () => {
        const known = await postResetRequest({ email: KNOWN_EMAIL });
        const unknown = await postResetRequest({ email: UNKNOWN_EMAIL });

        expect(known.status).toBe(unknown.status);
        expect(await known.text()).toBe(await unknown.text());

        await flushDeferredWork();
        expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });

    /**
     * The identical body is only half of the answer: work done before responding is
     * readable on the clock. Resolving the account costs a lookup, a link generation
     * and a call to the mail provider for an address that exists, and nothing at all
     * for one that does not — so none of it may happen while the caller is waiting.
     */
    it("resolves nothing about the account before answering", async () => {
        await postResetRequest({ email: KNOWN_EMAIL });

        expect(buildAuthActionLinkMock).not.toHaveBeenCalled();
        expect(sendEmailMock).not.toHaveBeenCalled();

        await flushDeferredWork();
        expect(buildAuthActionLinkMock).toHaveBeenCalledTimes(1);
        expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });

    it("defers the same amount of work for an address with no account", async () => {
        await postResetRequest({ email: UNKNOWN_EMAIL });

        expect(buildAuthActionLinkMock).not.toHaveBeenCalled();

        await flushDeferredWork();
        expect(buildAuthActionLinkMock).toHaveBeenCalledTimes(1);
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("answers success even when delivery fails", async () => {
        sendEmailMock.mockResolvedValue({
            sent: false,
            reason: "provider-error",
        });

        const response = await postResetRequest({ email: KNOWN_EMAIL });

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({ data: { requested: true } });
        await expect(flushDeferredWork()).resolves.toBeUndefined();
    });

    it("keeps the answer and swallows a failure raised after it", async () => {
        buildAuthActionLinkMock.mockRejectedValue(new Error("lookup down"));
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
            // silence the expected report
        });

        const response = await postResetRequest({ email: KNOWN_EMAIL });
        expect(response.status).toBe(HTTP_STATUS.OK);

        await expect(flushDeferredWork()).resolves.toBeUndefined();
        for (const [line] of errorSpy.mock.calls) {
            expect(String(line)).not.toContain(KNOWN_EMAIL);
        }
        errorSpy.mockRestore();
    });

    it("sends the reset action in the requested language", async () => {
        await postResetRequest({ email: KNOWN_EMAIL, locale: "es" });
        await flushDeferredWork();

        expect(buildAuthActionLinkMock).toHaveBeenCalledWith(
            "reset-password",
            KNOWN_EMAIL,
            "es"
        );
        expect(sendEmailMock).toHaveBeenCalledWith(
            expect.objectContaining({
                to: KNOWN_EMAIL,
                locale: "es",
                data: expect.objectContaining({
                    action: "resetPassword",
                    url: ACTION_URL,
                }),
            })
        );
    });

    it("falls back to the default language when none is asked for", async () => {
        await postResetRequest({ email: KNOWN_EMAIL });
        await flushDeferredWork();

        expect(buildAuthActionLinkMock).toHaveBeenCalledWith(
            "reset-password",
            KNOWN_EMAIL,
            "pt-br"
        );
    });

    it("rejects a malformed address", async () => {
        for (const email of ["", "   ", "not-an-email"]) {
            const response = await postResetRequest({ email });

            expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            expect(await response.json()).toEqual({
                error: { code: "VALIDATION_FAILED" },
            });
        }

        await flushDeferredWork();
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("rejects an unsupported language", async () => {
        const response = await postResetRequest({
            email: KNOWN_EMAIL,
            locale: "fr",
        });

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
});

describe("POST /auth/password/reset", () => {
    it("ends every open session of the account that changed its password", async () => {
        const response = await postResetConfirm({
            oobCode: "code",
            password: "secret1",
        });

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({ data: { confirmed: true } });
        expect(getUserByEmailMock).toHaveBeenCalledWith(KNOWN_EMAIL);
        expect(revokeUserSessionsMock).toHaveBeenCalledWith("uid-1");
    });

    it("still confirms when the sessions could not be revoked", async () => {
        getUserByEmailMock.mockRejectedValue(new Error("lookup down"));
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
            // silence the expected report
        });

        const response = await postResetConfirm({
            oobCode: "code",
            password: "secret1",
        });

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it.each([
        ["INVALID_OOB_CODE", "AUTH_OOB_CODE_INVALID", HTTP_STATUS.BAD_REQUEST],
        ["EXPIRED_OOB_CODE", "AUTH_OOB_CODE_EXPIRED", HTTP_STATUS.BAD_REQUEST],
        [
            "WEAK_PASSWORD : Password should be at least 6 characters",
            "USERS_AUTH_WEAK_PASSWORD",
            HTTP_STATUS.BAD_REQUEST,
        ],
        [
            "TOO_MANY_ATTEMPTS_TRY_LATER",
            "USERS_AUTH_RATE_LIMITED",
            HTTP_STATUS.TOO_MANY_REQUESTS,
        ],
        [
            "USER_DISABLED",
            "AUTH_PASSWORD_RESET_FAILED",
            HTTP_STATUS.BAD_REQUEST,
        ],
    ])("translates %s into a stable code", async (message, code, status) => {
        identityResetPasswordMock.mockRejectedValue(
            new FakeToolkitError(message)
        );

        const response = await postResetConfirm({
            oobCode: "code",
            password: "secret1",
        });

        expect(response.status).toBe(status);
        expect(await response.json()).toEqual({ error: { code } });
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
    });

    it("rejects a password below the minimum without calling the provider", async () => {
        const response = await postResetConfirm({
            oobCode: "code",
            password: "12345",
        });

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(identityResetPasswordMock).not.toHaveBeenCalled();
    });

    it("rejects a missing action code", async () => {
        for (const body of [
            { password: "secret1" },
            { oobCode: "", password: "secret1" },
            { oobCode: "   ", password: "secret1" },
        ]) {
            const response = await postResetConfirm(body);

            expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        }
        expect(identityResetPasswordMock).not.toHaveBeenCalled();
    });

    /**
     * Submitting the same link twice is ordinary — a double click, a reload, a mail
     * client that prefetched. The second attempt must read as a spent link and must
     * not end the sessions that the first attempt already re-established.
     */
    it("reports a link already spent as invalid and revokes nothing twice", async () => {
        const first = await postResetConfirm({
            oobCode: "code",
            password: "secret1",
        });
        expect(first.status).toBe(HTTP_STATUS.OK);
        expect(revokeUserSessionsMock).toHaveBeenCalledTimes(1);

        identityResetPasswordMock.mockRejectedValue(
            new FakeToolkitError("INVALID_OOB_CODE")
        );
        const second = await postResetConfirm({
            oobCode: "code",
            password: "secret1",
        });

        expect(second.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await second.json()).toEqual({
            error: { code: "AUTH_OOB_CODE_INVALID" },
        });
        expect(revokeUserSessionsMock).toHaveBeenCalledTimes(1);
    });

    it("rejects an action code past the accepted length before calling the provider", async () => {
        const response = await postResetConfirm({
            oobCode: "a".repeat(OOB_CODE_PAST_THE_CEILING),
            password: "secret1",
        });

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await response.json()).toEqual({
            error: { code: "VALIDATION_FAILED" },
        });
        expect(identityResetPasswordMock).not.toHaveBeenCalled();
    });

    it("rejects a password past the accepted length before calling the provider", async () => {
        const response = await postResetConfirm({
            oobCode: "code",
            password: "a".repeat(PASSWORD_PAST_THE_CEILING),
        });

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(identityResetPasswordMock).not.toHaveBeenCalled();
    });

    it("accepts the shortest and the longest password the provider allows", async () => {
        for (const password of [
            "a".repeat(SHORTEST_ACCEPTED_PASSWORD),
            "a".repeat(LONGEST_ACCEPTED_PASSWORD),
        ]) {
            const response = await postResetConfirm({
                oobCode: "code",
                password,
            });

            expect(response.status).toBe(HTTP_STATUS.OK);
        }
        expect(identityResetPasswordMock).toHaveBeenCalledTimes(2);
    });

    /**
     * The address is read back from the provider's answer, not from the request, so
     * a caller cannot aim the session revocation at somebody else's account.
     */
    it("revokes the sessions of the account the action code belonged to", async () => {
        identityResetPasswordMock.mockResolvedValue({
            email: "owner@example.com",
            requestType: "PASSWORD_RESET",
        });
        getUserByEmailMock.mockResolvedValue({ uid: "uid-owner" });

        await postResetConfirm({
            oobCode: "code",
            password: "secret1",
            email: "victim@example.com",
        });

        expect(getUserByEmailMock).toHaveBeenCalledWith("owner@example.com");
        expect(revokeUserSessionsMock).toHaveBeenCalledWith("uid-owner");
    });
});
