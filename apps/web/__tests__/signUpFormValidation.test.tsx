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

const { createAccountMutateMock } = vi.hoisted(() => ({
    createAccountMutateMock: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
    useMutation: () => ({ isPending: false, mutate: createAccountMutateMock }),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        user: null,
        loading: false,
        signIn: { isPending: false, mutate: vi.fn() },
        signInWithGoogle: { isPending: false, mutate: vi.fn() },
    }),
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        errorAlert: vi.fn(),
        infoAlert: vi.fn(),
        successAlert: vi.fn(),
        warningAlert: vi.fn(),
    }),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        setAuthorizationHeader: vi.fn(),
        authApi: { signUp: vi.fn(), sendEmailVerification: vi.fn() },
    },
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "es" }),
    usePathname: () => "/es/sign-up",
    useRouter: () => ({ push: vi.fn() }),
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
const { SignUpFormClient } = await import(
    "@/app/[locale]/sign-up/components/sign-up-form-client"
);

const signUpCopy = globalTranslations.es.apps.web.pages.signUp;
const VALID_PASSWORD = "valid-password";

function renderForm() {
    return render(
        <LocaleProvider>
            <SignUpFormClient />
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

function fillAndSubmit(container: HTMLElement, email: string) {
    fireEvent.change(inputNamed(container, "email"), {
        target: { value: email },
    });
    fireEvent.change(inputNamed(container, "password"), {
        target: { value: VALID_PASSWORD },
    });
    fireEvent.change(inputNamed(container, "confirmPassword"), {
        target: { value: VALID_PASSWORD },
    });
    fireEvent.click(
        screen.getByRole("button", { name: signUpCopy.form.submit })
    );
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    cleanup();
});

describe("web SignUpFormClient validation", () => {
    it.each(["abc", "qa@example", ""])(
        "shows the translated e-mail message for %j and creates no account",
        async (email) => {
            const { container } = renderForm();

            fillAndSubmit(container, email);

            expect(
                await screen.findByText(signUpCopy.validation.emailInvalid)
            ).toBeTruthy();
            expect(createAccountMutateMock).not.toHaveBeenCalled();
        }
    );

    it("creates the account once the e-mail is valid", async () => {
        const { container } = renderForm();

        fillAndSubmit(container, "qa-web-auth-forms@example.com");

        await waitFor(() =>
            expect(createAccountMutateMock).toHaveBeenCalledWith({
                email: "qa-web-auth-forms@example.com",
                password: VALID_PASSWORD,
            })
        );
    });
});
