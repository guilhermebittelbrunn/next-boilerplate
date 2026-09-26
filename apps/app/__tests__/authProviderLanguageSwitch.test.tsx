import useAuth from "@repo/auth/provider";
import {
    getDictionaryForLocale,
    LocaleProvider,
} from "@repo/internationalization/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    errorAlertMock,
    logoutMock,
    params,
    pushMock,
    signInMock,
    subscribers,
    successAlertMock,
} = vi.hoisted(() => ({
    errorAlertMock: vi.fn(),
    logoutMock: vi.fn(),
    params: { locale: "en" } as Record<string, string>,
    pushMock: vi.fn(),
    signInMock: vi.fn(),
    subscribers: [] as ((user: unknown) => void)[],
    successAlertMock: vi.fn(),
}));

vi.mock("@repo/auth/client", () => ({
    loginWithCustomToken: vi.fn(),
    logout: () => logoutMock(),
    signIn: (...args: unknown[]) => signInMock(...args),
    signInWithGoogle: vi.fn(),
    signUp: vi.fn(),
    subscribeToIdTokenState: (listener: (user: unknown) => void) => {
        subscribers.push(listener);
        return () => {
            subscribers.splice(subscribers.indexOf(listener), 1);
        };
    },
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        errorAlert: errorAlertMock,
        infoAlert: vi.fn(),
        successAlert: successAlertMock,
        warningAlert: vi.fn(),
    }),
}));

vi.mock("next/navigation", () => ({
    useParams: () => params,
}));

// `packages/auth` pins its own copy of Next, so the provider's `next/navigation` is a
// different module from the one the locale provider loads.
vi.mock("../../../packages/auth/node_modules/next/navigation.js", () => ({
    useRouter: () => ({ push: pushMock, refresh: vi.fn(), replace: vi.fn() }),
}));

const { AuthProvider } = await import("@repo/auth/provider");

const STATUS_OK = 200;
const STATUS_UNAUTHORIZED = 401;
const ONE_CALL = 1;

const fetchMock = vi.fn();

type AuthContextValue = ReturnType<typeof useAuth>;

function copyFor(locale: string) {
    return getDictionaryForLocale(locale).dictionary.packages.auth.provider;
}

function respondWith(status: number, body: unknown = {}) {
    fetchMock.mockResolvedValue({
        ok: status < STATUS_UNAUTHORIZED,
        status,
        json: () => Promise.resolve(body),
    } as Response);
}

function firebaseUser(): User {
    return {
        getIdToken: () => Promise.resolve("id-token"),
    } as unknown as User;
}

function stableAuthTree(onContext?: (value: AuthContextValue) => void) {
    const queryClient = new QueryClient({
        defaultOptions: {
            mutations: { retry: false },
            queries: { retry: false },
        },
    });
    function ContextProbe() {
        const value = useAuth();
        onContext?.(value);
        return null;
    }
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <ContextProbe />
            </AuthProvider>
        </QueryClientProvider>
    );
}

function switchLanguage(
    rerender: (ui: ReactElement) => void,
    tree: ReactElement,
    locale: string
) {
    params.locale = locale;
    window.history.pushState({}, "", `/${locale}/entities`);
    rerender(<LocaleProvider>{tree}</LocaleProvider>);
}

beforeEach(() => {
    cleanup();
    subscribers.length = 0;
    fetchMock.mockReset();
    errorAlertMock.mockReset();
    successAlertMock.mockReset();
    logoutMock.mockReset();
    pushMock.mockReset();
    signInMock.mockReset();
    params.locale = "en";
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState({}, "", "/en/entities");
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("AuthProvider acima do segmento [locale] numa troca de idioma sem remontar", () => {
    it("mostra o toast de login no idioma novo mesmo sem outra atualização de estado entre a troca e o login", async () => {
        let auth: AuthContextValue | undefined;
        const tree = stableAuthTree((value) => {
            auth = value;
        });
        const { rerender } = render(<LocaleProvider>{tree}</LocaleProvider>);

        switchLanguage(rerender, tree, "es");

        signInMock.mockResolvedValue({ user: firebaseUser() });
        respondWith(STATUS_OK);
        await act(async () => {
            await auth?.signIn.mutateAsync({
                email: "qa@example.com",
                password: "irrelevant",
            });
        });

        expect(successAlertMock).toHaveBeenCalledWith(copyFor("es").onSuccess);
        expect(pushMock).toHaveBeenCalledWith("/es");
    });

    it("usa o idioma novo no aviso de sessão expirada e no redirect para o login", async () => {
        const tree = stableAuthTree();
        const { rerender } = render(<LocaleProvider>{tree}</LocaleProvider>);

        switchLanguage(rerender, tree, "es");

        respondWith(STATUS_UNAUTHORIZED, {
            error: { code: "AUTH_SESSION_EXPIRED" },
        });
        await act(async () => {
            for (const listener of [...subscribers]) {
                listener(firebaseUser());
            }
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(logoutMock).toHaveBeenCalledTimes(ONE_CALL);
        });
        expect(errorAlertMock).toHaveBeenCalledWith(
            copyFor("es").session.expired
        );
        expect(pushMock).toHaveBeenCalledWith(
            "/es/sign-in?redirect=%2Fes%2Fentities"
        );
    });
});
