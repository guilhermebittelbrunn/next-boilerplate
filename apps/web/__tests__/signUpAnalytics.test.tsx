// @vitest-environment jsdom
import { globalTranslations } from "@repo/internationalization/translations/global";
import { PASSWORD_MIN_LENGTH } from "@repo/shared/utils/helpers/passwordPolicy";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    trackEventMock,
    signUpApiMock,
    signInMutateMock,
    googleMutateMock,
    googleMutateAsyncMock,
    isNewAccountMock,
    setAuthorizationHeaderMock,
} = vi.hoisted(() => ({
    trackEventMock: vi.fn(),
    signUpApiMock: vi.fn(),
    signInMutateMock: vi.fn(),
    googleMutateMock: vi.fn(),
    googleMutateAsyncMock: vi.fn(),
    isNewAccountMock: vi.fn(),
    setAuthorizationHeaderMock: vi.fn(),
}));

vi.mock("@repo/analytics/events-context", () => ({
    useAnalyticsEvent: () => trackEventMock,
}));

vi.mock("@repo/auth/client", () => ({
    isNewAccount: (...args: unknown[]) => isNewAccountMock(...args),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        loading: false,
        user: null,
        signIn: { isPending: false, mutate: signInMutateMock },
        signInWithGoogle: {
            isPending: false,
            mutate: googleMutateMock,
            mutateAsync: googleMutateAsyncMock,
        },
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
        setAuthorizationHeader: (...args: unknown[]) =>
            setAuthorizationHeaderMock(...args),
        authApi: {
            signUp: (...args: unknown[]) => signUpApiMock(...args),
            sendEmailVerification: vi.fn(),
        },
    },
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "en" }),
    usePathname: () => "/en/sign-up",
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
const { SignInFormClient } = await import(
    "@/app/[locale]/sign-in/components/sign-in-form-client"
);

const signUpCopy = globalTranslations.en.apps.web.pages.signUp;
const signInCopy = globalTranslations.en.apps.web.pages.signIn;
const EMAIL = "qa-dpq3-web@example.com";
const PASSWORD = "a".repeat(PASSWORD_MIN_LENGTH);
const BAD_REQUEST_STATUS = 400;
const ID_TOKEN = "google-id-token";
const GOOGLE_CREDENTIAL = {
    user: { getIdToken: () => Promise.resolve(ID_TOKEN) },
};

type GoogleMutateOptions = {
    onSuccess: (credential: unknown) => Promise<void> | void;
};

function renderInProviders(node: ReactNode) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <LocaleProvider>{node}</LocaleProvider>
        </QueryClientProvider>
    );
}

function inputNamed(name: string): HTMLInputElement {
    const input = document.querySelector<HTMLInputElement>(
        `input[name="${name}"]`
    );
    if (!input) {
        throw new Error(`the ${name} field was not rendered`);
    }
    return input;
}

function submitSignUp() {
    fireEvent.change(inputNamed("email"), { target: { value: EMAIL } });
    fireEvent.change(inputNamed("password"), { target: { value: PASSWORD } });
    fireEvent.change(inputNamed("confirmPassword"), {
        target: { value: PASSWORD },
    });
    fireEvent.click(
        screen.getByRole("button", { name: signUpCopy.form.submit })
    );
}

function apiError(code: string): AxiosError {
    const headers = new AxiosHeaders();
    const config = { headers };
    return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
        status: BAD_REQUEST_STATUS,
        statusText: "Bad Request",
        headers,
        config,
        data: { error: { code } },
    } as never);
}

function clickSignInWithGoogle(): GoogleMutateOptions {
    renderInProviders(<SignInFormClient />);
    fireEvent.click(
        screen.getByRole("button", { name: signInCopy.googleSignIn })
    );
    const [, options] = googleMutateMock.mock.calls[0] as [
        unknown,
        GoogleMutateOptions,
    ];
    return options;
}

beforeEach(() => {
    vi.clearAllMocks();
    signUpApiMock.mockResolvedValue({ created: true });
    googleMutateAsyncMock.mockResolvedValue(GOOGLE_CREDENTIAL);
    isNewAccountMock.mockReturnValue(false);
});

afterEach(cleanup);

describe("web sign-up form — sign_up event", () => {
    it("reports an e-mail sign-up once, with the method only, before signing in", async () => {
        renderInProviders(<SignUpFormClient />);
        submitSignUp();

        await waitFor(() => expect(signInMutateMock).toHaveBeenCalledTimes(1));
        expect(trackEventMock).toHaveBeenCalledTimes(1);
        expect(trackEventMock).toHaveBeenCalledWith("sign_up", {
            method: "email",
        });
        expect(trackEventMock.mock.invocationCallOrder[0]).toBeLessThan(
            signInMutateMock.mock.invocationCallOrder[0] ?? 0
        );
    });

    it("reports nothing when the API refuses the sign-up", async () => {
        signUpApiMock.mockRejectedValue(apiError("AUTH_EMAIL_EXISTS"));
        renderInProviders(<SignUpFormClient />);
        submitSignUp();

        await waitFor(() => expect(signUpApiMock).toHaveBeenCalledTimes(1));
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(signInMutateMock).not.toHaveBeenCalled();
        expect(trackEventMock).not.toHaveBeenCalled();
    });

    it("reports a Google sign-up when the popup created the account", async () => {
        isNewAccountMock.mockReturnValue(true);
        renderInProviders(<SignUpFormClient />);

        fireEvent.click(
            screen.getByRole("button", { name: signUpCopy.googleSignIn })
        );

        await waitFor(() => expect(trackEventMock).toHaveBeenCalledTimes(1));
        expect(isNewAccountMock).toHaveBeenCalledWith(GOOGLE_CREDENTIAL);
        expect(trackEventMock).toHaveBeenCalledWith("sign_up", {
            method: "google",
        });
    });

    it("reports nothing when the Google account already existed", async () => {
        renderInProviders(<SignUpFormClient />);

        fireEvent.click(
            screen.getByRole("button", { name: signUpCopy.googleSignIn })
        );

        await waitFor(() => expect(isNewAccountMock).toHaveBeenCalledTimes(1));
        expect(trackEventMock).not.toHaveBeenCalled();
    });

    it("reports nothing and leaves the error to the provider when the Google sign-in fails", async () => {
        googleMutateAsyncMock.mockRejectedValue(new Error("popup closed"));
        renderInProviders(<SignUpFormClient />);

        fireEvent.click(
            screen.getByRole("button", { name: signUpCopy.googleSignIn })
        );

        await waitFor(() =>
            expect(googleMutateAsyncMock).toHaveBeenCalledTimes(1)
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(isNewAccountMock).not.toHaveBeenCalled();
        expect(trackEventMock).not.toHaveBeenCalled();
    });
});

describe("web sign-in form — sign_up event", () => {
    it("reports a Google sign-up when the first Google access starts on the sign-in screen", async () => {
        isNewAccountMock.mockReturnValue(true);
        const options = clickSignInWithGoogle();

        await options.onSuccess(GOOGLE_CREDENTIAL);

        expect(trackEventMock).toHaveBeenCalledTimes(1);
        expect(trackEventMock).toHaveBeenCalledWith("sign_up", {
            method: "google",
        });
        expect(setAuthorizationHeaderMock).toHaveBeenCalledWith(ID_TOKEN);
    });

    it("reports nothing for a returning Google account and still keeps the token", async () => {
        const options = clickSignInWithGoogle();

        await options.onSuccess(GOOGLE_CREDENTIAL);

        expect(trackEventMock).not.toHaveBeenCalled();
        expect(setAuthorizationHeaderMock).toHaveBeenCalledWith(ID_TOKEN);
    });
});
