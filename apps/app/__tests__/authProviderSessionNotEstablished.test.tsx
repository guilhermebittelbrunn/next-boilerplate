import useAuth, { type AuthProviderProps } from "@repo/auth/provider";
import {
    getDictionaryForLocale,
    LocaleProvider,
} from "@repo/internationalization/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render } from "@testing-library/react";
import type { User } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    errorAlertMock,
    logoutMock,
    params,
    pushMock,
    signInMock,
    signInWithEmailLinkCodeMock,
    signInWithGoogleMock,
    successAlertMock,
} = vi.hoisted(() => ({
    errorAlertMock: vi.fn(),
    logoutMock: vi.fn(),
    params: { locale: "en" } as Record<string, string>,
    pushMock: vi.fn(),
    signInMock: vi.fn(),
    signInWithEmailLinkCodeMock: vi.fn(),
    signInWithGoogleMock: vi.fn(),
    successAlertMock: vi.fn(),
}));

vi.mock("@repo/auth/client", () => ({
    loginWithCustomToken: vi.fn(),
    logout: () => logoutMock(),
    signIn: (...args: unknown[]) => signInMock(...args),
    signInWithGoogle: (...args: unknown[]) => signInWithGoogleMock(...args),
    signInWithEmailLinkCode: (...args: unknown[]) =>
        signInWithEmailLinkCodeMock(...args),
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

const STATUS_OK = 200;
const STATUS_FORBIDDEN = 403;
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

function acceptSession() {
    fetchMock.mockResolvedValue({
        ok: true,
        status: STATUS_OK,
        json: () => Promise.resolve({}),
    } as Response);
}

function refuseForeignOrigin() {
    fetchMock.mockResolvedValue({
        ok: false,
        status: STATUS_FORBIDDEN,
        json: () =>
            Promise.resolve({ error: { code: "AUTH_FORBIDDEN_ORIGIN" } }),
    } as Response);
}

function firebaseCredential() {
    return {
        user: {
            getIdToken: () => Promise.resolve("id-token"),
        } as unknown as User,
    };
}

function authTree(
    onContext: (value: AuthContextValue) => void,
    providerProps: Omit<AuthProviderProps, "children"> = {}
) {
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
            <AuthProvider {...providerProps}>
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
    logoutMock.mockReset();
    logoutMock.mockResolvedValue(undefined);
    signInMock.mockReset();
    signInMock.mockResolvedValue(firebaseCredential());
    signInWithGoogleMock.mockReset();
    signInWithGoogleMock.mockResolvedValue(firebaseCredential());
    signInWithEmailLinkCodeMock.mockReset();
    signInWithEmailLinkCodeMock.mockResolvedValue(firebaseCredential());
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

    it.each([
        ["responde 500", refuseSession],
        ["responde 403 AUTH_FORBIDDEN_ORIGIN", refuseForeignOrigin],
        [
            "nem chega ao servidor",
            () => fetchMock.mockRejectedValue(new TypeError("Failed to fetch")),
        ],
    ] as const)(
        "desloga o cliente e zera o token quando a gravação %s",
        async (_case, refuse) => {
            params.locale = "en";
            let auth: AuthContextValue | undefined;
            render(
                <LocaleProvider>
                    {authTree((value) => {
                        auth = value;
                    })}
                </LocaleProvider>
            );

            refuse();
            await signInWithPassword(auth);

            expect(logoutMock).toHaveBeenCalledTimes(1);
            expect(auth?.accessToken).toBeNull();
            expect(errorAlertMock).toHaveBeenCalledWith(
                copyFor("en").session.notEstablished
            );
            expect(successAlertMock).not.toHaveBeenCalled();
            expect(pushMock).not.toHaveBeenCalled();
        }
    );
});

describe("AuthProvider quando o servidor grava a sessão depois do login", () => {
    it("navega sem deslogar", async () => {
        params.locale = "en";
        let auth: AuthContextValue | undefined;
        render(
            <LocaleProvider>
                {authTree(
                    (value) => {
                        auth = value;
                    },
                    { resolveDefaultPostLoginPath: async () => "/en/entities" }
                )}
            </LocaleProvider>
        );

        acceptSession();
        await signInWithPassword(auth);

        expect(logoutMock).not.toHaveBeenCalled();
        expect(auth?.accessToken).toBe("id-token");
        expect(successAlertMock).toHaveBeenCalledWith(copyFor("en").onSuccess);
        expect(pushMock).toHaveBeenCalledWith("/en/entities");
        expect(errorAlertMock).not.toHaveBeenCalled();
    });

    it("cai no destino padrão sem alerta de sessão quando o destino não resolve", async () => {
        params.locale = "en";
        let auth: AuthContextValue | undefined;
        render(
            <LocaleProvider>
                {authTree(
                    (value) => {
                        auth = value;
                    },
                    {
                        resolveDefaultPostLoginPath: () =>
                            Promise.reject(new Error("profile lookup failed")),
                    }
                )}
            </LocaleProvider>
        );

        acceptSession();
        await signInWithPassword(auth);

        expect(pushMock).toHaveBeenCalledWith("/en");
        expect(successAlertMock).toHaveBeenCalledWith(copyFor("en").onSuccess);
        expect(errorAlertMock).not.toHaveBeenCalled();
        expect(logoutMock).not.toHaveBeenCalled();
    });
});

describe("AuthProvider com a sessão recusada nos outros métodos de login", () => {
    it("desloga sem navegar quando a sessão do login com Google é recusada", async () => {
        params.locale = "en";
        let auth: AuthContextValue | undefined;
        render(
            <LocaleProvider>
                {authTree((value) => {
                    auth = value;
                })}
            </LocaleProvider>
        );

        refuseForeignOrigin();
        await act(async () => {
            await auth?.signInWithGoogle.mutateAsync();
        });

        expect(logoutMock).toHaveBeenCalledTimes(1);
        expect(auth?.accessToken).toBeNull();
        expect(errorAlertMock).toHaveBeenCalledWith(
            copyFor("en").session.notEstablished
        );
        expect(successAlertMock).not.toHaveBeenCalled();
        expect(pushMock).not.toHaveBeenCalled();
    });

    it("desloga sem navegar e mantém a mutação do link por e-mail em sucesso quando a sessão é recusada", async () => {
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
        await act(async () => {
            await auth?.signInWithEmailLink.mutateAsync({
                email: "qa@example.com",
                oobCode: "code",
            });
        });

        expect(auth?.signInWithEmailLink.isSuccess).toBe(true);
        expect(logoutMock).toHaveBeenCalledTimes(1);
        expect(auth?.accessToken).toBeNull();
        expect(errorAlertMock).toHaveBeenCalledWith(
            copyFor("en").session.notEstablished
        );
        expect(successAlertMock).not.toHaveBeenCalled();
        expect(pushMock).not.toHaveBeenCalled();
    });
});
