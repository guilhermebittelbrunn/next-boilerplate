import useAuth, { type AuthProviderProps } from "@repo/auth/provider";
import { LocaleProvider } from "@repo/internationalization/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type IdTokenListener = (user: User | null) => void;

const {
    designSystemProps,
    idTokenListeners,
    logoutMock,
    params,
    pushMock,
    replaceMock,
    signInMock,
    signInWithEmailLinkCodeMock,
} = vi.hoisted(() => ({
    designSystemProps: { current: null as Record<string, unknown> | null },
    idTokenListeners: [] as IdTokenListener[],
    logoutMock: vi.fn(),
    params: { locale: "en" } as Record<string, string>,
    pushMock: vi.fn(),
    replaceMock: vi.fn(),
    signInMock: vi.fn(),
    signInWithEmailLinkCodeMock: vi.fn(),
}));

vi.mock("@repo/auth/client", () => ({
    loginWithCustomToken: vi.fn(),
    logout: () => logoutMock(),
    signIn: (...args: unknown[]) => signInMock(...args),
    signInWithGoogle: vi.fn(),
    signInWithEmailLinkCode: (...args: unknown[]) =>
        signInWithEmailLinkCodeMock(...args),
    subscribeToIdTokenState: (listener: IdTokenListener) => {
        idTokenListeners.push(listener);
        queueMicrotask(() => listener(null));
        return vi.fn();
    },
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        errorAlert: vi.fn(),
        infoAlert: vi.fn(),
        successAlert: vi.fn(),
        warningAlert: vi.fn(),
    }),
}));

vi.mock("@repo/design-system", () => ({
    DesignSystemProvider: ({
        children,
        ...props
    }: {
        children: ReactNode;
    } & Record<string, unknown>) => {
        designSystemProps.current = props;
        return children;
    },
}));

vi.mock("next-themes", () => ({
    useTheme: () => ({ theme: "light" }),
}));

vi.mock("@/shared/lib/themePreference", () => ({
    syncThemeCookieWithChoice: vi.fn(),
}));

vi.mock("@/shared/lib/postLoginNavigation", () => ({
    resolveAppPostLoginPath: vi.fn(),
    resolveDefaultPostLoginForApp: vi.fn(),
}));

// `packages/auth` has its own `next` entry. Depending on how pnpm resolves it, the provider's
// `next/navigation` is either a separate copy or the very module the locale provider loads,
// so both mocks carry the whole surface the two consumers read.
vi.mock("next/navigation", () => ({
    useParams: () => params,
    useRouter: () => ({ push: pushMock, refresh: vi.fn(), replace: vi.fn() }),
}));
vi.mock("../../../packages/auth/node_modules/next/navigation.js", () => ({
    useParams: () => params,
    useRouter: () => ({ push: pushMock, refresh: vi.fn(), replace: vi.fn() }),
}));

const { AuthProvider } = await import("@repo/auth/provider");
const { useSignedInRedirect } = await import(
    "@/shared/hooks/useSignedInRedirect"
);
const { AppDesignProvider } = await import(
    "@/shared/providers/AppDesignProvider"
);

const ORIGIN = "http://localhost:3000";
const DESTINATION = "/en/entities";
const STATUS_OK = 200;
const STATUS_UNAUTHORIZED = 401;
const STATUS_INTERNAL_ERROR = 500;

const fetchMock = vi.fn();
const originalLocation = window.location;

type AuthContextValue = ReturnType<typeof useAuth>;

function jsonResponse(status: number, body: unknown = {}) {
    return {
        ok: status === STATUS_OK,
        status,
        json: () => Promise.resolve(body),
    } as Response;
}

function firebaseUser() {
    return { getIdToken: () => Promise.resolve("id-token") } as unknown as User;
}

function renderProvider(
    providerProps: Omit<AuthProviderProps, "children">,
    children?: ReactNode
) {
    const queryClient = new QueryClient({
        defaultOptions: {
            mutations: { retry: false },
            queries: { retry: false },
        },
    });
    let auth: AuthContextValue | undefined;
    function ContextProbe() {
        auth = useAuth();
        return null;
    }
    render(
        <LocaleProvider>
            <QueryClientProvider client={queryClient}>
                <AuthProvider {...providerProps}>
                    <ContextProbe />
                    {children}
                </AuthProvider>
            </QueryClientProvider>
        </LocaleProvider>
    );
    return () => auth;
}

async function signInWithPassword(auth: AuthContextValue | undefined) {
    await act(async () => {
        await auth?.signIn.mutateAsync({
            email: "qa@example.com",
            password: "irrelevant",
        });
    });
}

beforeEach(() => {
    cleanup();
    params.locale = "en";
    idTokenListeners.length = 0;
    designSystemProps.current = null;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse(STATUS_OK));
    logoutMock.mockReset();
    logoutMock.mockResolvedValue(undefined);
    pushMock.mockReset();
    replaceMock.mockReset();
    signInMock.mockReset();
    signInMock.mockResolvedValue({ user: firebaseUser() });
    signInWithEmailLinkCodeMock.mockReset();
    signInWithEmailLinkCodeMock.mockResolvedValue({ user: firebaseUser() });
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(window, "location", {
        configurable: true,
        value: {
            origin: ORIGIN,
            pathname: "/en/sign-in",
            replace: replaceMock,
            search: "",
        },
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
    });
});

describe("navegação depois do login com postLoginNavigation", () => {
    it("carrega o destino como documento novo quando a app pede página inteira", async () => {
        const getAuth = renderProvider({
            postLoginNavigation: "full-page",
            resolveDefaultPostLoginPath: async () => DESTINATION,
        });

        await signInWithPassword(getAuth());

        expect(replaceMock).toHaveBeenCalledWith(DESTINATION);
        expect(pushMock).not.toHaveBeenCalled();
    });

    it("leva o login por link de e-mail à mesma navegação de página inteira", async () => {
        const getAuth = renderProvider({
            postLoginNavigation: "full-page",
            resolveDefaultPostLoginPath: async () => DESTINATION,
        });

        await act(async () => {
            await getAuth()?.signInWithEmailLink.mutateAsync({
                email: "qa@example.com",
                oobCode: "code",
            });
        });

        expect(getAuth()?.signInWithEmailLink.isSuccess).toBe(true);
        expect(replaceMock).toHaveBeenCalledWith(DESTINATION);
        expect(pushMock).not.toHaveBeenCalled();
    });

    it("não navega de jeito nenhum quando a sessão é recusada", async () => {
        const getAuth = renderProvider({ postLoginNavigation: "full-page" });
        fetchMock.mockResolvedValue(jsonResponse(STATUS_INTERNAL_ERROR));

        await signInWithPassword(getAuth());

        expect(replaceMock).not.toHaveBeenCalled();
        expect(pushMock).not.toHaveBeenCalled();
        expect(logoutMock).toHaveBeenCalledTimes(1);
    });

    it("segue com router.push quando a prop não é passada, como na landing", async () => {
        const getAuth = renderProvider({
            resolveDefaultPostLoginPath: async () => DESTINATION,
        });

        await signInWithPassword(getAuth());

        expect(pushMock).toHaveBeenCalledWith(DESTINATION);
        expect(replaceMock).not.toHaveBeenCalled();
    });

    it("a app liga a navegação de página inteira no provider", () => {
        render(
            <AppDesignProvider>
                <p>panel</p>
            </AppDesignProvider>
        );

        expect(designSystemProps.current?.postLoginNavigation).toBe(
            "full-page"
        );
    });
});

describe("corrida entre a tela de login e o provider", () => {
    it("com um login em andamento, a tela não grava a sessão e só o provider navega, com página inteira", async () => {
        let releaseDestination: (() => void) | undefined;
        const destinationReady = new Promise<void>((resolve) => {
            releaseDestination = resolve;
        });
        fetchMock.mockImplementation((url: string) => {
            if (url === "/api/auth/session") {
                return Promise.reject(new TypeError("Failed to fetch"));
            }
            if (url === `${ORIGIN}/api/auth/session/refresh`) {
                return Promise.resolve(
                    jsonResponse(STATUS_UNAUTHORIZED, {
                        error: { code: "AUTH_NO_SESSION" },
                    })
                );
            }
            return Promise.resolve(jsonResponse(STATUS_OK));
        });
        signInMock.mockImplementation(() => {
            const user = firebaseUser();
            for (const listener of idTokenListeners) {
                listener(user);
            }
            return Promise.resolve({ user });
        });
        function SignInScreen() {
            useSignedInRedirect();
            return null;
        }
        const getAuth = renderProvider(
            {
                postLoginNavigation: "full-page",
                resolveDefaultPostLoginPath: async () => {
                    await destinationReady;
                    return DESTINATION;
                },
            },
            <SignInScreen />
        );

        await waitFor(() => {
            expect(getAuth()?.loading).toBe(false);
        });
        const signingIn = getAuth()?.signIn.mutateAsync({
            email: "qa@example.com",
            password: "irrelevant",
        });
        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                `${ORIGIN}/api/auth/session`,
                expect.objectContaining({ method: "POST" })
            );
        });
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        await act(async () => {
            releaseDestination?.();
            await signingIn;
        });

        expect(fetchMock).not.toHaveBeenCalledWith(
            "/api/auth/session",
            expect.anything()
        );
        expect(logoutMock).not.toHaveBeenCalled();
        expect(replaceMock).toHaveBeenCalledWith(DESTINATION);
        expect(replaceMock).toHaveBeenCalledTimes(1);
    });
});
