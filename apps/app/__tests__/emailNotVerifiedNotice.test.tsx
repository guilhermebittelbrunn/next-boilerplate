import { getDictionary } from "@repo/internationalization/client";
import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { panelMock, authMock, resendMock } = vi.hoisted(() => ({
    panelMock: vi.fn(),
    authMock: vi.fn(),
    resendMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
}));
vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => panelMock(),
}));
vi.mock("@repo/auth/provider", () => ({ default: () => authMock() }));
vi.mock("@/shared/hooks/useEmailVerification", () => ({
    useEmailVerification: () => ({
        resendVerificationMutation: {
            mutate: resendMock,
            isPending: false,
        },
    }),
}));

const { EmailNotVerifiedNotice } = await import(
    "@/shared/components/ui/EmailNotVerifiedNotice"
);

const noticeCopy =
    getDictionary().dictionary.apps.app.pages.emailVerification.notice;

type AuthState = {
    loading?: boolean;
    user?: { emailVerified: boolean } | null;
};

function given(auth: AuthState, panel?: { isImpersonating: boolean }) {
    authMock.mockReturnValue({
        loading: false,
        user: { emailVerified: false },
        ...auth,
    });
    panelMock.mockReturnValue({ isImpersonating: false, ...panel });
}

beforeEach(() => {
    cleanup();
    panelMock.mockReset();
    authMock.mockReset();
    resendMock.mockReset();
});

describe("EmailNotVerifiedNotice", () => {
    it("announces the pending confirmation and offers a resend", () => {
        given({});

        render(<EmailNotVerifiedNotice />);

        const notice = screen.getByRole("alert");
        expect(notice.textContent).toContain(noticeCopy.title);
        expect(notice.textContent).toContain(noticeCopy.description);
        screen.getByRole("button", { name: noticeCopy.resend }).click();
        expect(resendMock).toHaveBeenCalledTimes(1);
    });

    it("renders nothing once the address is confirmed", () => {
        given({ user: { emailVerified: true } });

        const { container } = render(<EmailNotVerifiedNotice />);

        expect(container.innerHTML).toBe("");
    });

    /**
     * An admin acting as someone else must not be able to send mail to that person,
     * and their own confirmation state is not what the panel is showing.
     */
    it("renders nothing while an admin acts as another user", () => {
        given({}, { isImpersonating: true });

        const { container } = render(<EmailNotVerifiedNotice />);

        expect(container.innerHTML).toBe("");
    });

    it("stays quiet while the session is still resolving", () => {
        given({ loading: true });

        const { container } = render(<EmailNotVerifiedNotice />);

        expect(container.innerHTML).toBe("");
    });

    it("renders nothing for a visitor with no account", () => {
        given({ user: null });

        const { container } = render(<EmailNotVerifiedNotice />);

        expect(container.innerHTML).toBe("");
    });
});
