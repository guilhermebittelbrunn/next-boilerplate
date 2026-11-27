import { AuditAction } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    canSendAuthActionLinkMock,
    buildAuthActionLinkMock,
    sendEmailMock,
    identityCheckOobCodeMock,
    identityApplyOobCodeMock,
    findByReferenceIdMock,
    recordLifecycleMock,
} = vi.hoisted(() => ({
    findByReferenceIdMock: vi.fn(),
    recordLifecycleMock: vi.fn(),
    resolveApiActorMock: vi.fn(),
    canSendAuthActionLinkMock: vi.fn(),
    buildAuthActionLinkMock: vi.fn(),
    sendEmailMock: vi.fn(),
    identityCheckOobCodeMock: vi.fn(),
    identityApplyOobCodeMock: vi.fn(),
}));

class FakeToolkitError extends Error {}

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiActor: (...args: unknown[]) => resolveApiActorMock(...args),
}));

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

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
    },
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAccountLifecycleEvent: (...args: unknown[]) =>
        recordLifecycleMock(...args),
}));

vi.mock("@/(shared)/lib/firebase-identity-toolkit", () => ({
    IdentityToolkitError: FakeToolkitError,
    identityCheckOobCode: (...args: unknown[]) =>
        identityCheckOobCodeMock(...args),
    identityApplyOobCode: (...args: unknown[]) =>
        identityApplyOobCodeMock(...args),
}));

const ACTOR_EMAIL = "actor@example.com";
const ACTION_URL = "https://app.example.com/pt-br/verify-email?oobCode=code";
const LONGEST_ACCEPTED_OOB_CODE = 2048;
const OOB_CODE_PAST_THE_CEILING = LONGEST_ACCEPTED_OOB_CODE + 1;

function requestFor(url: string, body: unknown) {
    return new Request(`http://localhost:3002${url}`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-request-id": "req-confirm",
        },
        body: JSON.stringify(body),
    }) as unknown as NextRequest;
}

async function postSend(body: unknown) {
    const { POST } = await import(
        "@/app/(routes)/auth/email-verification/send/route"
    );
    return POST(requestFor("/auth/email-verification/send", body));
}

async function postConfirm(body: unknown) {
    const { POST } = await import(
        "@/app/(routes)/auth/email-verification/confirm/route"
    );
    return POST(requestFor("/auth/email-verification/confirm", body));
}

beforeEach(() => {
    vi.clearAllMocks();
    resolveApiActorMock.mockResolvedValue({
        uid: "uid-1",
        email: ACTOR_EMAIL,
        emailVerified: false,
        displayName: "Jane",
    });
    canSendAuthActionLinkMock.mockReturnValue(true);
    buildAuthActionLinkMock.mockResolvedValue(ACTION_URL);
    sendEmailMock.mockResolvedValue({ sent: true, id: "mail-1" });
    identityCheckOobCodeMock.mockResolvedValue({
        requestType: "VERIFY_EMAIL",
        email: ACTOR_EMAIL,
    });
    identityApplyOobCodeMock.mockResolvedValue({
        localId: "uid-1",
        email: ACTOR_EMAIL,
        emailVerified: true,
    });
    findByReferenceIdMock.mockResolvedValue({ id: "profile-1" });
});

describe("POST /auth/email-verification/send", () => {
    it("refuses a caller with no session", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await postSend({});

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await response.json()).toEqual({
            error: { code: "AUTH_INVALID_TOKEN" },
        });
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("mails the actor, never an address taken from the body", async () => {
        await postSend({ locale: "en", email: "someone-else@example.com" });

        expect(buildAuthActionLinkMock).toHaveBeenCalledWith(
            "verify-email",
            ACTOR_EMAIL,
            "en"
        );
        expect(sendEmailMock).toHaveBeenCalledWith(
            expect.objectContaining({
                to: ACTOR_EMAIL,
                locale: "en",
                data: expect.objectContaining({
                    action: "verifyEmail",
                    name: "Jane",
                    url: ACTION_URL,
                }),
            })
        );
    });

    it("says nothing new about an account already verified", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: "uid-1",
            email: ACTOR_EMAIL,
            emailVerified: true,
        });

        const response = await postSend({});

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({ data: { requested: true } });
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("reports a delivery failure to the account holder", async () => {
        sendEmailMock.mockResolvedValue({
            sent: false,
            reason: "provider-error",
        });

        const response = await postSend({});

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await response.json()).toEqual({
            error: { code: "EMAIL_SEND_FAILED" },
        });
    });

    it("reports a fork with no mailer configured", async () => {
        canSendAuthActionLinkMock.mockReturnValue(false);

        const response = await postSend({});

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await response.json()).toEqual({
            error: { code: "EMAIL_NOT_CONFIGURED" },
        });
    });

    /**
     * A link the provider refused to mint is a send that did not happen, not a bad
     * action code: the answer must not send the account holder off to ask for a new
     * link, which is the button they just pressed.
     */
    it("reports a link the provider would not mint as a failed send", async () => {
        buildAuthActionLinkMock.mockResolvedValue(null);

        const response = await postSend({});

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await response.json()).toEqual({
            error: { code: "EMAIL_SEND_FAILED" },
        });
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("never answers the resend with a confirmation error code", async () => {
        buildAuthActionLinkMock.mockResolvedValue(null);

        const response = await postSend({});

        expect(await response.text()).not.toContain(
            "AUTH_EMAIL_VERIFICATION_FAILED"
        );
    });

    it("rejects an unsupported language", async () => {
        const response = await postSend({ locale: "fr" });

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(sendEmailMock).not.toHaveBeenCalled();
    });
});

describe("POST /auth/email-verification/confirm", () => {
    it("applies the action code", async () => {
        const response = await postConfirm({ oobCode: "code" });

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({ data: { confirmed: true } });
        expect(identityApplyOobCodeMock).toHaveBeenCalledWith("code");
    });

    it.each([
        ["INVALID_OOB_CODE", "AUTH_OOB_CODE_INVALID"],
        ["EXPIRED_OOB_CODE", "AUTH_OOB_CODE_EXPIRED"],
        ["SOMETHING_ELSE", "AUTH_EMAIL_VERIFICATION_FAILED"],
    ])("translates %s into a stable code", async (message, code) => {
        identityApplyOobCodeMock.mockRejectedValue(
            new FakeToolkitError(message)
        );

        const response = await postConfirm({ oobCode: "code" });

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await response.json()).toEqual({ error: { code } });
    });

    it("rejects a missing action code", async () => {
        const response = await postConfirm({});

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(identityCheckOobCodeMock).not.toHaveBeenCalled();
        expect(identityApplyOobCodeMock).not.toHaveBeenCalled();
    });

    it("checks the action code before applying it", async () => {
        await postConfirm({ oobCode: "code" });

        expect(identityCheckOobCodeMock).toHaveBeenCalledWith("code");
        expect(
            identityCheckOobCodeMock.mock.invocationCallOrder[0]
        ).toBeLessThan(identityApplyOobCodeMock.mock.invocationCallOrder[0]);
    });

    /**
     * An email-change code applied here would move the address without the session
     * revocation and the audit event of its own route, so it is refused unspent.
     */
    it.each(["VERIFY_AND_CHANGE_EMAIL", "PASSWORD_RESET"])(
        "refuses a %s code without spending it",
        async (requestType) => {
            identityCheckOobCodeMock.mockResolvedValue({
                requestType,
                email: ACTOR_EMAIL,
                newEmail: "actor.new@example.com",
            });

            const response = await postConfirm({ oobCode: "code" });

            expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            expect(await response.json()).toEqual({
                error: { code: "AUTH_OOB_CODE_INVALID" },
            });
            expect(identityApplyOobCodeMock).not.toHaveBeenCalled();
        }
    );

    it.each([
        ["INVALID_OOB_CODE", "AUTH_OOB_CODE_INVALID"],
        ["EXPIRED_OOB_CODE", "AUTH_OOB_CODE_EXPIRED"],
    ])(
        "translates %s from the check into a stable code",
        async (message, code) => {
            identityCheckOobCodeMock.mockRejectedValue(
                new FakeToolkitError(message)
            );

            const response = await postConfirm({ oobCode: "code" });

            expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            expect(await response.json()).toEqual({ error: { code } });
            expect(identityApplyOobCodeMock).not.toHaveBeenCalled();
        }
    );

    /**
     * A link opened twice is the ordinary case, not an attack: mail clients prefetch
     * and users reload. The second visit has to read as a spent link with a way to
     * ask for another, never as a raw provider message.
     */
    it("reports an action code spent by an earlier visit as invalid", async () => {
        const first = await postConfirm({ oobCode: "code" });
        expect(first.status).toBe(HTTP_STATUS.OK);

        identityApplyOobCodeMock.mockRejectedValue(
            new FakeToolkitError("INVALID_OOB_CODE")
        );
        const second = await postConfirm({ oobCode: "code" });

        expect(second.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await second.json()).toEqual({
            error: { code: "AUTH_OOB_CODE_INVALID" },
        });
    });

    it("rejects an action code past the accepted length before calling the provider", async () => {
        const response = await postConfirm({
            oobCode: "a".repeat(OOB_CODE_PAST_THE_CEILING),
        });

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await response.json()).toEqual({
            error: { code: "VALIDATION_FAILED" },
        });
        expect(identityCheckOobCodeMock).not.toHaveBeenCalled();
        expect(identityApplyOobCodeMock).not.toHaveBeenCalled();
    });

    it("accepts an action code right at the accepted length", async () => {
        const response = await postConfirm({
            oobCode: "a".repeat(LONGEST_ACCEPTED_OOB_CODE),
        });

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(identityApplyOobCodeMock).toHaveBeenCalledTimes(1);
    });

    it("needs no session: the action code is the credential", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await postConfirm({ oobCode: "code" });

        expect(response.status).toBe(HTTP_STATUS.OK);
    });
});

describe("POST /auth/email-verification/confirm leaves a trail", () => {
    it("records the confirmation for the holder of the verified account", async () => {
        await postConfirm({ oobCode: "code" });

        expect(findByReferenceIdMock).toHaveBeenCalledWith("uid-1");
        expect(recordLifecycleMock).toHaveBeenCalledTimes(1);
        expect(recordLifecycleMock).toHaveBeenCalledWith({
            action: AuditAction.ACCOUNT_EMAIL_VERIFY,
            profileId: "profile-1",
            uid: "uid-1",
            label: ACTOR_EMAIL,
            requestId: "req-confirm",
        });
    });

    it("records nothing when the provider refuses the code", async () => {
        identityApplyOobCodeMock.mockRejectedValue(
            new FakeToolkitError("INVALID_OOB_CODE")
        );

        await postConfirm({ oobCode: "code" });

        expect(recordLifecycleMock).not.toHaveBeenCalled();
    });

    it("records nothing for a code of another type", async () => {
        identityCheckOobCodeMock.mockResolvedValue({
            requestType: "PASSWORD_RESET",
            email: ACTOR_EMAIL,
        });

        await postConfirm({ oobCode: "code" });

        expect(recordLifecycleMock).not.toHaveBeenCalled();
    });

    it("still confirms and logs without personal data when the account has no profile", async () => {
        findByReferenceIdMock.mockResolvedValue(null);
        const warned: string[] = [];
        const warnSpy = vi
            .spyOn(console, "warn")
            .mockImplementation((line: string) => {
                warned.push(line);
            });

        const response = await postConfirm({ oobCode: "code" });

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(recordLifecycleMock).not.toHaveBeenCalled();
        expect(warned.join("\n")).toContain("[audit] subject-not-found");
        expect(warned.join("\n")).not.toContain(ACTOR_EMAIL);
        warnSpy.mockRestore();
    });

    it("still confirms when the profile lookup fails", async () => {
        findByReferenceIdMock.mockRejectedValue(new Error("unavailable"));
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
            // silence the expected log line
        });

        const response = await postConfirm({ oobCode: "code" });

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(recordLifecycleMock).not.toHaveBeenCalled();
        warnSpy.mockRestore();
    });
});
