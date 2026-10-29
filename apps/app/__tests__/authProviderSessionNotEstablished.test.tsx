import useAuth from "@repo/auth/provider";
import {
    getDictionaryForLocale,
    LocaleProvider,
} from "@repo/internationalization/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render } from "@testing-library/react";
import type { User } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { errorAlertMock, params, pushMock, signInMock, successAlertMock } =
    vi.hoisted(() => ({
        errorAlertMock: vi.fn(),
        params: { locale: "en" } as Record<string, string>,
        pushMock: vi.fn(),
        signInMock: vi.fn(),
        successAlertMock: vi.fn(),
    }));

vi.mock("@repo/auth/client", () => ({
    loginWithCustomToken: vi.fn(),
    logout: vi.fn(),
    signIn: (...args: unknown[]) => signInMock(...args),
    signInWithGoogle: vi.fn(),
    signInWithEmailLinkCode: vi.fn(),
    subscribeToIdTokenState: () => vi.fn(),
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

const STATUS_INTERNAL_ERROR = 500;
const LOCALES = ["pt-br", "en", "es"] as const;

const fetchMock = vi.fn();

type AuthContextValue = ReturnType<typeof useAuth>;

function copyFor(locale: string) {
    return getDictionaryForLocale(locale).dictionary.packages.auth.provider;
}

function refuseSession() {
    fetchMock.mockResolvedValue({
        ok: false,
        status: STATUS_INTERNAL_ERROR,
        json: () => Promise.resolve({}),
    } as Response);
}

function firebaseCredential() {
    return {
        user: {
            getIdToken: () => Promise.resolve("id-token"),
        } as unknown as User,
    };
}

function authTree(onContext: (value: AuthContextValue) => void) {
    const queryClient = new QueryClient({
        defaultOptions: {
            mutations: { retry: false },
            queries: { retry: false },
        },
    });
    function ContextProbe() {
        onContext(useAuth());
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
    fetchMock.mockReset();
    errorAlertMock.mockReset();
    successAlertMock.mockReset();
    pushMock.mockReset();
    signInMock.mockReset();
    signInMock.mockResolvedValue(firebaseCredential());
    vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("AuthProvider quando o servidor recusa a sessão depois do login", () => {
    it.each(LOCALES)(
        "mostra o alerta traduzido em %s sem toast de sucesso nem navegação",
        async (locale) => {
            params.locale = locale;
            let auth: AuthContextValue | undefined;
            render(
                <LocaleProvider>
                    {authTree((value) => {
                        auth = value;
                    })}
                </LocaleProvider>
            );

            refuseSession();
            await signInWithPassword(auth);

            expect(errorAlertMock).toHaveBeenCalledWith(
                copyFor(locale).session.notEstablished
            );
            expect(successAlertMock).not.toHaveBeenCalled();
            expect(pushMock).not.toHaveBeenCalled();
        }
    );

    it("mostra o mesmo alerta quando a requisição da sessão nem chega ao servidor", async () => {
        params.locale = "en";
        let auth: AuthContextValue | undefined;
        render(
            <LocaleProvider>
                {authTree((value) => {
                    auth = value;
                })}
            </LocaleProvider>
        );

        fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
        await signInWithPassword(auth);

        expect(errorAlertMock).toHaveBeenCalledWith(
            copyFor("en").session.notEstablished
        );
        expect(successAlertMock).not.toHaveBeenCalled();
        expect(pushMock).not.toHaveBeenCalled();
    });

    it("usa o idioma novo depois de uma troca de idioma sem remontar", async () => {
        params.locale = "pt-br";
        let auth: AuthContextValue | undefined;
        const tree = authTree((value) => {
            auth = value;
        });
        const { rerender } = render(<LocaleProvider>{tree}</LocaleProvider>);

        params.locale = "es";
        rerender(<LocaleProvider>{tree}</LocaleProvider>);

        refuseSession();
        await signInWithPassword(auth);

        expect(errorAlertMock).toHaveBeenCalledWith(
            copyFor("es").session.notEstablished
        );
        expect(errorAlertMock).not.toHaveBeenCalledWith(
            copyFor("pt-br").session.notEstablished
        );
    });
});
