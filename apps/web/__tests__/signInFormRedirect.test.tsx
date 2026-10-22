// @vitest-environment jsdom
import { globalTranslations } from "@repo/internationalization/translations/global";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authState, pushMock, signInMutateMock, googleSignInMutateMock } =
    vi.hoisted(() => ({
        authState: {
            user: null as { id: string } | null,
            loading: false,
        },
        pushMock: vi.fn(),
        signInMutateMock: vi.fn(),
        googleSignInMutateMock: vi.fn(),
    }));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        user: authState.user,
        loading: authState.loading,
        signIn: { isPending: false, mutate: signInMutateMock },
        signInWithGoogle: { isPending: false, mutate: googleSignInMutateMock },
    }),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { setAuthorizationHeader: vi.fn() },
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "en" }),
    usePathname: () => "/en/sign-in",
    useRouter: () => ({ push: pushMock }),
}));

vi.mock("next/link", () => ({
    default: ({
        children,
        ...props
    }: {
        children: ReactNode;
        [prop: string]: unknown;
    }) => <a {...props}>{children}</a>,
}));

const { LocaleProvider } = await import("@repo/internationalization/client");
const { SignInFormClient } = await import(
    "@/app/[locale]/sign-in/components/sign-in-form-client"
);

const signInCopy = globalTranslations.en.apps.web.pages.signIn;
const SIGNED_IN_USER = { id: "user-1" };
const VALID_EMAIL = "qa-web-auth-forms@example.com";
const VALID_PASSWORD = "valid-password";

function tree() {
    return (
        <LocaleProvider>
            <SignInFormClient />
        </LocaleProvider>
    );
}

function inputNamed(container: HTMLElement, name: string): HTMLInputElement {
    const input = container.querySelector<HTMLInputElement>(
        `input[name="${name}"]`
    );
    if (!input) {
        throw new Error(`no input named "${name}" was rendered`);
    }
    return input;
}

beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    authState.loading = false;
});

afterEach(() => {
    cleanup();
});

describe("web SignInFormClient redirect", () => {
    it("sends a visitor who arrives already signed in to the locale home", () => {
        authState.user = SIGNED_IN_USER;

        render(tree());

        expect(pushMock).toHaveBeenCalledWith("/en");
    });

    it("stays on the form while nobody is signed in", () => {
        render(tree());

        expect(pushMock).not.toHaveBeenCalled();
        expect(
            screen.getByRole("button", { name: signInCopy.form.submit })
        ).toBeTruthy();
    });

    it("waits for the auth state to settle before navigating", () => {
        authState.user = SIGNED_IN_USER;
        authState.loading = true;

        render(tree());

        expect(pushMock).not.toHaveBeenCalled();
    });

    it("leaves the navigation of an e-mail sign-in started on this screen to the auth provider", async () => {
        const { container, rerender } = render(tree());
        fireEvent.change(inputNamed(container, "email"), {
            target: { value: VALID_EMAIL },
        });
        fireEvent.change(inputNamed(container, "password"), {
            target: { value: VALID_PASSWORD },
        });
        fireEvent.click(
            screen.getByRole("button", { name: signInCopy.form.submit })
        );
        await waitFor(() => expect(signInMutateMock).toHaveBeenCalledTimes(1));
        expect(signInMutateMock.mock.calls[0]?.[0]).toEqual({
            email: VALID_EMAIL,
            password: VALID_PASSWORD,
        });

        authState.user = SIGNED_IN_USER;
        rerender(tree());

        expect(pushMock).not.toHaveBeenCalled();
    });

    it("leaves the navigation of a Google sign-in started on this screen to the auth provider", () => {
        const { rerender } = render(tree());
        fireEvent.click(
            screen.getByRole("button", { name: signInCopy.googleSignIn })
        );
        expect(googleSignInMutateMock).toHaveBeenCalledTimes(1);

        authState.user = SIGNED_IN_USER;
        rerender(tree());

        expect(pushMock).not.toHaveBeenCalled();
    });

    it("leaves e-mail validation to the translated form messages instead of the browser bubble", async () => {
        const { container } = render(tree());

        expect(container.querySelector("form")?.noValidate).toBe(true);

        fireEvent.change(inputNamed(container, "email"), {
            target: { value: "abc" },
        });
        fireEvent.change(inputNamed(container, "password"), {
            target: { value: VALID_PASSWORD },
        });
        fireEvent.click(
            screen.getByRole("button", { name: signInCopy.form.submit })
        );

        expect(
            await screen.findByText(signInCopy.validation.emailInvalid)
        ).toBeTruthy();
        expect(signInMutateMock).not.toHaveBeenCalled();
    });
});
