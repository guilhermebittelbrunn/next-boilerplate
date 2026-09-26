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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    signUpApiMock,
    sendEmailVerificationMock,
    setAuthorizationHeaderMock,
    signInMutateMock,
    errorAlertMock,
} = vi.hoisted(() => ({
    signUpApiMock: vi.fn(),
    sendEmailVerificationMock: vi.fn(),
    setAuthorizationHeaderMock: vi.fn(),
    signInMutateMock: vi.fn(),
    errorAlertMock: vi.fn(),
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
        errorAlert: errorAlertMock,
        infoAlert: vi.fn(),
        successAlert: vi.fn(),
        warningAlert: vi.fn(),
    }),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        setAuthorizationHeader: (...args: unknown[]) =>
            setAuthorizationHeaderMock(...args),
        authApi: {
            signUp: (...args: unknown[]) => signUpApiMock(...args),
            sendEmailVerification: (...args: unknown[]) =>
                sendEmailVerificationMock(...args),
        },
    },
}));

vi.mock("@/shared/lib/googleSignInApi", () => ({
    signInWithGoogleViaApi: vi.fn(),
}));

vi.mock("@/shared/lib/postLoginNavigation", () => ({
    resolveAppPostLoginPath: vi.fn(),
}));

const { default: SignUpFormClient } = await import(
    "@/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient"
);

const dictionary = globalTranslations["pt-br"];
const signUpCopy = dictionary.apps.app.pages.signUp;
const EMAIL = "qa-password-policy-app@example.com";
const ACCEPTED_PASSWORD = "a".repeat(PASSWORD_MIN_LENGTH);
const BAD_REQUEST_STATUS = 400;

function renderForm() {
    const queryClient = new QueryClient({
        defaultOptions: {
            mutations: { retry: false },
            queries: { retry: false },
        },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <SignUpFormClient />
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

function fillAndSubmit(password: string) {
    fireEvent.change(inputNamed("email"), { target: { value: EMAIL } });
    fireEvent.change(inputNamed("password"), { target: { value: password } });
    fireEvent.change(inputNamed("confirmPassword"), {
        target: { value: password },
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
    signUpApiMock.mockResolvedValue({ created: true });
    sendEmailVerificationMock.mockResolvedValue({ requested: true });
});

afterEach(cleanup);

describe("SignUpFormClient", () => {
    it("creates the account through the API and then signs in with the same credentials", async () => {
        renderForm();
        fillAndSubmit(ACCEPTED_PASSWORD);

        await waitFor(() => expect(signInMutateMock).toHaveBeenCalledTimes(1));
        expect(signUpApiMock).toHaveBeenCalledWith({
            email: EMAIL,
            password: ACCEPTED_PASSWORD,
        });
        expect(signInMutateMock.mock.calls[0]?.[0]).toEqual({
            email: EMAIL,
            password: ACCEPTED_PASSWORD,
        });
    });

    it("still asks for the verification email once the sign-in succeeds", async () => {
        renderForm();
        fillAndSubmit(ACCEPTED_PASSWORD);
        await waitFor(() => expect(signInMutateMock).toHaveBeenCalledTimes(1));

        const [, options] = signInMutateMock.mock.calls[0] as [
            unknown,
            { onSuccess: (credential: unknown) => Promise<void> },
        ];
        await options.onSuccess({
            user: { getIdToken: () => Promise.resolve("fresh-id-token") },
        });

        expect(setAuthorizationHeaderMock).toHaveBeenCalledWith(
            "fresh-id-token"
        );
        expect(sendEmailVerificationMock).toHaveBeenCalledWith({
            locale: "pt-br",
        });
    });

    it("shows the translated API error and does not sign in", async () => {
        signUpApiMock.mockRejectedValue(
            apiError("USERS_AUTH_EMAIL_ALREADY_IN_USE")
        );

        renderForm();
        fillAndSubmit(ACCEPTED_PASSWORD);

        await waitFor(() =>
            expect(errorAlertMock).toHaveBeenCalledWith(
                dictionary.packages.utils.apiErrors
                    .USERS_AUTH_EMAIL_ALREADY_IN_USE
            )
        );
        expect(signInMutateMock).not.toHaveBeenCalled();
    });

    it("refuses a password one character short inline without calling the API", async () => {
        renderForm();
        fillAndSubmit("a".repeat(PASSWORD_MIN_LENGTH - 1));

        expect(
            (await screen.findAllByText(signUpCopy.validation.passwordMin))
                .length
        ).toBeGreaterThan(0);
        expect(signUpApiMock).not.toHaveBeenCalled();
        expect(signInMutateMock).not.toHaveBeenCalled();
    });
});
