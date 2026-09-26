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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Deferred<T> = {
    promise: Promise<T>;
    resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
    const handle = {} as Deferred<T>;
    handle.promise = new Promise<T>((settle) => {
        handle.resolve = settle;
    });
    return handle;
}

const { signUpApiMock, signInFnMock, sendEmailVerificationMock } = vi.hoisted(
    () => ({
        signUpApiMock: vi.fn(),
        signInFnMock: vi.fn(),
        sendEmailVerificationMock: vi.fn(),
    })
);

vi.mock("@repo/auth/provider", async () => {
    const { useMutation } = await import("@tanstack/react-query");
    return {
        default: () => ({
            loading: false,
            user: null,
            signIn: useMutation({
                mutationFn: (credentials: unknown) => signInFnMock(credentials),
            }),
        }),
    };
});

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        errorAlert: vi.fn(),
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
        setAuthorizationHeader: vi.fn(),
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

const signUpCopy = globalTranslations["pt-br"].apps.app.pages.signUp;
const EMAIL = "qa-password-policy-app@example.com";
const ACCEPTED_PASSWORD = "a".repeat(PASSWORD_MIN_LENGTH);
const SIGNED_IN_CREDENTIAL = {
    user: { getIdToken: () => Promise.resolve("fresh-id-token") },
};

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

function fillValidForm() {
    fireEvent.change(inputNamed("email"), { target: { value: EMAIL } });
    fireEvent.change(inputNamed("password"), {
        target: { value: ACCEPTED_PASSWORD },
    });
    fireEvent.change(inputNamed("confirmPassword"), {
        target: { value: ACCEPTED_PASSWORD },
    });
}

function submitButton(): HTMLButtonElement {
    return screen.getByRole("button", { name: signUpCopy.form.submit });
}

function googleButton(): HTMLButtonElement {
    return screen.getByRole("button", { name: signUpCopy.googleSignIn });
}

function recordDisabledChanges(button: HTMLButtonElement) {
    const changes: boolean[] = [];
    const observer = new MutationObserver((records) => {
        for (const record of records) {
            changes.push((record.target as HTMLButtonElement).disabled);
        }
    });
    observer.observe(button, {
        attributeFilter: ["disabled"],
        attributes: true,
    });
    return {
        changes,
        stop: () => {
            for (const record of observer.takeRecords()) {
                changes.push((record.target as HTMLButtonElement).disabled);
            }
            observer.disconnect();
        },
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    sendEmailVerificationMock.mockResolvedValue({ requested: true });
});

afterEach(cleanup);

describe("SignUpFormClient submit lock", () => {
    it("keeps both buttons disabled from account creation until the sign-in settles, with no gap in between", async () => {
        const accountCreation = deferred<{ created: true }>();
        const signInRequest = deferred<typeof SIGNED_IN_CREDENTIAL>();
        signUpApiMock.mockReturnValue(accountCreation.promise);
        signInFnMock.mockReturnValue(signInRequest.promise);

        renderForm();
        fillValidForm();
        const submitRecorder = recordDisabledChanges(submitButton());
        const googleRecorder = recordDisabledChanges(googleButton());

        fireEvent.click(submitButton());

        await waitFor(() => expect(signUpApiMock).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(submitButton().disabled).toBe(true));
        expect(googleButton().disabled).toBe(true);

        accountCreation.resolve({ created: true });
        await waitFor(() => expect(signInFnMock).toHaveBeenCalledTimes(1));
        expect(submitButton().disabled).toBe(true);
        expect(googleButton().disabled).toBe(true);

        signInRequest.resolve(SIGNED_IN_CREDENTIAL);
        await waitFor(() => expect(submitButton().disabled).toBe(false));

        submitRecorder.stop();
        googleRecorder.stop();
        expect(submitRecorder.changes).toEqual([true, false]);
        expect(googleRecorder.changes).toEqual([true, false]);
    });

    it("sends a single account creation when the submit button is clicked again while the request is pending", async () => {
        const accountCreation = deferred<{ created: true }>();
        signUpApiMock.mockReturnValue(accountCreation.promise);
        signInFnMock.mockResolvedValue(SIGNED_IN_CREDENTIAL);

        renderForm();
        fillValidForm();

        fireEvent.click(submitButton());
        await waitFor(() => expect(submitButton().disabled).toBe(true));
        fireEvent.click(submitButton());

        accountCreation.resolve({ created: true });
        await waitFor(() => expect(signInFnMock).toHaveBeenCalledTimes(1));
        expect(signUpApiMock).toHaveBeenCalledTimes(1);
    });
});
