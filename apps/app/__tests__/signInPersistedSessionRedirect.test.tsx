import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authState, postLoginPathMock, replaceMock } = vi.hoisted(() => ({
    authState: {
        loading: false,
        user: null as { getIdToken: () => Promise<string> } | null,
    },
    postLoginPathMock: vi.fn(),
    replaceMock: vi.fn(),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        loading: authState.loading,
        signIn: { isPending: false, mutate: vi.fn() },
        user: authState.user,
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

const STATUS_OK = 200;
const STATUS_UNAUTHORIZED = 401;
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

async function renderWithPersistedUser() {
    authState.user = { getIdToken: () => Promise.resolve(ID_TOKEN) };
    const queryClient = new QueryClient({
        defaultOptions: {
            mutations: { retry: false },
            queries: { retry: false },
        },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <SignInForm />
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
 * The form writes the session cookie before navigating, because the proxy bounces any
 * authenticated destination that arrives without one. Once the absolute lifetime can
 * refuse that write, navigating anyway sends the browser on a round trip back to this
 * same screen — which never renders, because a user is still signed in on the client.
 */
describe("sessão persistida na tela de login", () => {
    it("não navega quando a gravação do cookie responde 401", async () => {
        givenSessionStatus(STATUS_UNAUTHORIZED);

        await renderWithPersistedUser();

        expect(replaceMock).not.toHaveBeenCalled();
        expect(postLoginPathMock).not.toHaveBeenCalled();
    });

    it("navega para o destino quando a gravação do cookie é aceita", async () => {
        givenSessionStatus(STATUS_OK);

        await renderWithPersistedUser();

        await waitFor(() => {
            expect(replaceMock).toHaveBeenCalledWith(HOME_PATH);
        });
    });
});
