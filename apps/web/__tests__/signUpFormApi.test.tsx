import { globalTranslations } from "@repo/internationalization/translations/global";
import { AxiosError, AxiosHeaders } from "axios";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type CapturedMutation = {
    mutationFn: (variables: unknown) => Promise<unknown>;
    onError: (error: unknown) => void;
    onSuccess: (data: unknown, variables: unknown) => void;
};

const { mutations, signUpApiMock, signInMutateMock, errorAlertMock } =
    vi.hoisted(() => ({
        mutations: [] as CapturedMutation[],
        signUpApiMock: vi.fn(),
        signInMutateMock: vi.fn(),
        errorAlertMock: vi.fn(),
    }));

/**
 * This workspace renders on the server only (no DOM in its test setup), so the form is
 * rendered once to string and the sign-up contract is exercised through the mutation
 * options the component registered.
 */
vi.mock("@tanstack/react-query", () => ({
    useMutation: (options: CapturedMutation) => {
        mutations.push(options);
        return { isPending: false, mutate: vi.fn() };
    },
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        loading: false,
        user: null,
        signIn: { isPending: false, mutate: signInMutateMock },
        signInWithGoogle: { isPending: false, mutate: vi.fn() },
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

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        authApi: { signUp: (...args: unknown[]) => signUpApiMock(...args) },
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

const CREDENTIALS = {
    email: "qa-password-policy-web@example.com",
    password: "oito-car",
};
const BAD_REQUEST_STATUS = 400;

function renderAndCaptureSignUp(): CapturedMutation {
    renderToString(
        <LocaleProvider>
            <SignUpFormClient />
        </LocaleProvider>
    );
    const [createAccount] = mutations;
    if (!createAccount) {
        throw new Error("the form registered no mutation");
    }
    return createAccount;
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
    mutations.length = 0;
    signUpApiMock.mockResolvedValue({ created: true });
});

describe("web SignUpFormClient", () => {
    it("creates the account through the API", async () => {
        const createAccount = renderAndCaptureSignUp();

        await createAccount.mutationFn(CREDENTIALS);

        expect(signUpApiMock).toHaveBeenCalledWith(CREDENTIALS);
    });

    it("signs in with the same credentials once the account exists", () => {
        const createAccount = renderAndCaptureSignUp();

        createAccount.onSuccess({ created: true }, CREDENTIALS);

        expect(signInMutateMock).toHaveBeenCalledWith(CREDENTIALS);
    });

    it("shows the translated API error in the route's language and does not sign in", () => {
        const createAccount = renderAndCaptureSignUp();

        createAccount.onError(apiError("AUTH_PASSWORD_TOO_SHORT"));

        expect(errorAlertMock).toHaveBeenCalledWith(
            globalTranslations.en.packages.utils.apiErrors
                .AUTH_PASSWORD_TOO_SHORT
        );
        expect(signInMutateMock).not.toHaveBeenCalled();
    });
});
