import { beforeEach, describe, expect, it, vi } from "vitest";

const { envMock, canSendAuthActionLinkMock } = vi.hoisted(() => ({
    envMock: { EMAIL_LINK_SIGN_IN_ENABLED: undefined as string | undefined },
    canSendAuthActionLinkMock: vi.fn(),
}));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@/(shared)/lib/auth-action-links", () => ({
    canSendAuthActionLink: () => canSendAuthActionLinkMock(),
}));

const { isEmailLinkSignInAvailable, isEmailLinkSignInEnabled } = await import(
    "@/(shared)/lib/email-link-sign-in"
);

beforeEach(() => {
    canSendAuthActionLinkMock.mockReturnValue(true);
});

describe("isEmailLinkSignInEnabled", () => {
    it.each([
        [undefined, false],
        ["", false],
        ["   ", false],
        ["false", false],
        ["0", false],
        ["1", false],
        ["yes", false],
        ["true", true],
        [" TRUE ", true],
        ["True", true],
    ])("reads %j as %s", (value, expected) => {
        envMock.EMAIL_LINK_SIGN_IN_ENABLED = value;

        expect(isEmailLinkSignInEnabled()).toBe(expected);
    });
});

describe("isEmailLinkSignInAvailable", () => {
    it("needs the switch and a working mailer", () => {
        envMock.EMAIL_LINK_SIGN_IN_ENABLED = "true";
        expect(isEmailLinkSignInAvailable()).toBe(true);

        canSendAuthActionLinkMock.mockReturnValue(false);
        expect(isEmailLinkSignInAvailable()).toBe(false);
    });

    it("stays off when switched off, even with a working mailer", () => {
        envMock.EMAIL_LINK_SIGN_IN_ENABLED = undefined;

        expect(isEmailLinkSignInAvailable()).toBe(false);
    });
});
