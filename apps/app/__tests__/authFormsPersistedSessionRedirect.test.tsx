import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authState, logoutMock, postLoginPathMock, replaceMock } = vi.hoisted(
    () => ({
        authState: {
            loading: false,
            user: null as { getIdToken: () => Promise<string> } | null,
        },
        logoutMock: vi.fn(),
        postLoginPathMock: vi.fn(),
        replaceMock: vi.fn(),
    })
);

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        loading: authState.loading,
        signIn: { isPending: false, mutate: vi.fn() },
        user: authState.user,
    }),
}));

vi.mock("@repo/auth/client", () => ({
    logout: () => logoutMock(),
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
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { setAuthorizationHeader: vi.fn() },
}));

vi.mock("@/shared/lib/googleSignInApi", () => ({
    signInWithGoogleViaApi: vi.fn(),
}));

vi.mock("@/shared/lib/postLoginNavigation", () => ({
    resolveAppPostLoginPath: (...args: unknown[]) => postLoginPathMock(...args),
}));

const { SignInForm } = await import(
    "@/app/[locale]/(unauthenticated)/sign-in/components/SignInForm"
);
const { default: SignUpFormClient } = await import(
    "@/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient"
);

const STATUS_OK = 200;
const STATUS_BAD_REQUEST = 400;
const STATUS_UNAUTHORIZED = 401;
const STATUS_FORBIDDEN = 403;
const HOME_PATH = "/pt-br";
const ID_TOKEN = "id-token";

const fetchMock = vi.fn();
const originalLocation = window.location;

function givenSessionStatus(status: number) {
    fetchMock.mockResolvedValue({
        ok: status === STATUS_OK,
        status,
        json: () => Promise.resolve({}),
    } as Response);
}

async function renderWithPersistedUser(Form: ComponentType) {
    authState.user = { getIdToken: () => Promise.resolve(ID_TOKEN) };
    const queryClient = new QueryClient({
        defaultOptions: {
            mutations: { retry: false },
            queries: { retry: false },
        },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <Form />
        </QueryClientProvider>
    );
    await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
    });
    await act(async () => {
        await Promise.resolve();
    });
}

beforeEach(() => {
    cleanup();
    fetchMock.mockReset();
    replaceMock.mockReset();
    logoutMock.mockReset();
    logoutMock.mockResolvedValue(undefined);
    postLoginPathMock.mockReset();
    postLoginPathMock.mockResolvedValue(HOME_PATH);
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(window, "location", {
        configurable: true,
        value: { pathname: "/pt-br/sign-in", replace: replaceMock, search: "" },
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
    });
});

/**
 * The forms write the session cookie before navigating, because the proxy bounces any
 * authenticated destination that arrives without one. Navigating after a refused write
 * sends the browser back to this same screen, where the still signed-in client user
 * starts the round trip again.
 */
describe.each([
    ["login", SignInForm],
    ["cadastro", SignUpFormClient],
] as const)("sessão persistida na tela de %s", (_screen, Form) => {
    it.each([STATUS_BAD_REQUEST, STATUS_UNAUTHORIZED, STATUS_FORBIDDEN])(
        "desloga e não navega quando a gravação do cookie responde %i",
        async (status) => {
            givenSessionStatus(status);

            await renderWithPersistedUser(Form);

            await waitFor(() => {
                expect(logoutMock).toHaveBeenCalledTimes(1);
            });
            expect(replaceMock).not.toHaveBeenCalled();
            expect(postLoginPathMock).not.toHaveBeenCalled();
        }
    );

    it("desloga e não navega quando a requisição nem chega ao servidor", async () => {
        fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

        await renderWithPersistedUser(Form);

        await waitFor(() => {
            expect(logoutMock).toHaveBeenCalledTimes(1);
        });
        expect(replaceMock).not.toHaveBeenCalled();
    });

    it("navega para o destino quando a gravação do cookie é aceita", async () => {
        givenSessionStatus(STATUS_OK);

        await renderWithPersistedUser(Form);

        await waitFor(() => {
            expect(replaceMock).toHaveBeenCalledWith(HOME_PATH);
        });
        expect(replaceMock).toHaveBeenCalledTimes(1);
        expect(logoutMock).not.toHaveBeenCalled();
    });
});
