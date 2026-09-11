import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    canSendAuthActionLinkMock,
    buildAuthActionLinkMock,
    sendEmailMock,
    identityApplyOobCodeMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    canSendAuthActionLinkMock: vi.fn(),
    buildAuthActionLinkMock: vi.fn(),
    sendEmailMock: vi.fn(),
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

vi.mock("@/(shared)/lib/firebase-identity-toolkit", () => ({
    IdentityToolkitError: FakeToolkitError,
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
        headers: { "content-type": "application/json" },
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
    identityApplyOobCodeMock.mockResolvedValue({
        localId: "uid-1",
        email: ACTOR_EMAIL,
        emailVerified: true,
    });
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
        expect(identityApplyOobCodeMock).not.toHaveBeenCalled();
    });

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
