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

type GoogleSignInOptions = { onAccountCreated?: () => void };

const {
    trackEventMock,
    signUpApiMock,
    signInMutateMock,
    googleSignInMock,
    googleAccount,
} = vi.hoisted(() => ({
    trackEventMock: vi.fn(),
    signUpApiMock: vi.fn(),
    signInMutateMock: vi.fn(),
    googleSignInMock: vi.fn(),
    googleAccount: { created: false },
}));

vi.mock("@repo/analytics/events-context", () => ({
    useAnalyticsEvent: () => trackEventMock,
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        loading: false,
        user: null,
        signIn: { isPending: false, mutate: signInMutateMock },
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

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        setAuthorizationHeader: vi.fn(),
        authApi: {
            signUp: (...args: unknown[]) => signUpApiMock(...args),
            sendEmailVerification: vi.fn(),
        },
    },
}));

vi.mock("@/shared/lib/googleSignInApi", () => ({
    signInWithGoogleViaApi: (options?: GoogleSignInOptions) => {
        if (googleAccount.created) {
            options?.onAccountCreated?.();
        }
        return googleSignInMock(options);
    },
}));

vi.mock("@/shared/lib/postLoginNavigation", () => ({
    resolveAppPostLoginPath: vi.fn().mockResolvedValue("/pt-br"),
}));

const { LocaleProvider } = await import("@repo/internationalization/client");
const { default: SignUpFormClient } = await import(
    "@/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient"
);
const { SignInForm } = await import(
    "@/app/[locale]/(unauthenticated)/sign-in/components/SignInForm"
);

const dictionary = globalTranslations["pt-br"];
const signUpCopy = dictionary.apps.app.pages.signUp;
const signInCopy = dictionary.apps.app.pages.signIn;
const EMAIL = "qa-dpq3-app@example.com";
const PASSWORD = "a".repeat(PASSWORD_MIN_LENGTH);
const BAD_REQUEST_STATUS = 400;
const GOOGLE_RESULT = {
    session: { idToken: "id-token", refreshToken: "r", expiresIn: "3600" },
    user: null,
};

function renderInProviders(node: ReactNode) {
    const queryClient = new QueryClient({
        defaultOptions: {
            mutations: { retry: false },
            queries: { retry: false },
        },
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

beforeEach(() => {
    vi.clearAllMocks();
    googleAccount.created = false;
    signUpApiMock.mockResolvedValue({ created: true });
    googleSignInMock.mockResolvedValue(GOOGLE_RESULT);
});

afterEach(cleanup);

describe("app sign-up form — sign_up event", () => {
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
        googleAccount.created = true;
        renderInProviders(<SignUpFormClient />);

        fireEvent.click(
            screen.getByRole("button", { name: signUpCopy.googleSignIn })
        );

        await waitFor(() => expect(googleSignInMock).toHaveBeenCalledTimes(1));
        expect(trackEventMock).toHaveBeenCalledTimes(1);
        expect(trackEventMock).toHaveBeenCalledWith("sign_up", {
            method: "google",
        });
    });

    it("reports nothing when the Google account already existed", async () => {
        renderInProviders(<SignUpFormClient />);

        fireEvent.click(
            screen.getByRole("button", { name: signUpCopy.googleSignIn })
        );

        await waitFor(() => expect(googleSignInMock).toHaveBeenCalledTimes(1));
        expect(trackEventMock).not.toHaveBeenCalled();
    });
});

describe("app sign-in form — sign_up event", () => {
    it("reports a Google sign-up when the first Google access starts on the sign-in screen", async () => {
        googleAccount.created = true;
        renderInProviders(<SignInForm />);

        fireEvent.click(
            screen.getByRole("button", { name: signInCopy.googleSignIn })
        );

        await waitFor(() => expect(googleSignInMock).toHaveBeenCalledTimes(1));
        expect(trackEventMock).toHaveBeenCalledTimes(1);
        expect(trackEventMock).toHaveBeenCalledWith("sign_up", {
            method: "google",
        });
    });

    it("reports nothing for a returning Google account", async () => {
        renderInProviders(<SignInForm />);

        fireEvent.click(
            screen.getByRole("button", { name: signInCopy.googleSignIn })
        );

        await waitFor(() => expect(googleSignInMock).toHaveBeenCalledTimes(1));
        expect(trackEventMock).not.toHaveBeenCalled();
    });

    it("reports nothing for an e-mail sign-in", async () => {
        renderInProviders(<SignInForm />);

        fireEvent.change(inputNamed("email"), { target: { value: EMAIL } });
        fireEvent.change(inputNamed("password"), {
            target: { value: PASSWORD },
        });
        fireEvent.click(
            screen.getByRole("button", { name: signInCopy.form.submit })
        );

        await waitFor(() => expect(signInMutateMock).toHaveBeenCalledTimes(1));
        expect(trackEventMock).not.toHaveBeenCalled();
    });
});
