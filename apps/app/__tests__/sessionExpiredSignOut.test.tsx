import { getDictionary } from "@repo/internationalization/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { errorAlertMock, logoutMock, pushMock, subscribers, successAlertMock } =
    vi.hoisted(() => ({
        errorAlertMock: vi.fn(),
        logoutMock: vi.fn(),
        pushMock: vi.fn(),
        subscribers: [] as ((user: unknown) => void)[],
        successAlertMock: vi.fn(),
    }));

vi.mock("@repo/auth/client", () => ({
    loginWithCustomToken: vi.fn(),
    logout: () => logoutMock(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
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

// `packages/auth` pins its own copy of Next, so the provider's `next/navigation` is a
// different module from the one this file resolves. Bundlers collapse the two; the test
// resolver does not, so the mock has to name the copy the provider actually loads.
vi.mock("../../../packages/auth/node_modules/next/navigation.js", () => ({
    useRouter: () => ({ push: pushMock, refresh: vi.fn(), replace: vi.fn() }),
}));

const { AuthProvider } = await import("@repo/auth/provider");

const STATUS_OK = 200;
const STATUS_UNAUTHORIZED = 401;
const STATUS_SERVER_ERROR = 500;
const ONE_CALL = 1;
const ID_TOKEN = "id-token";
const CURRENT_PATH = "/pt-br/entities";
const SIGN_IN_PATH = "/pt-br/sign-in";
const SIGN_IN_WITH_REDIRECT = "/pt-br/sign-in?redirect=%2Fpt-br%2Fentities";
const SIGN_IN_WITH_FOREIGN_REDIRECT =
    "/pt-br/sign-in?redirect=https%3A%2F%2Fevil.example";
const REFRESH_PATH = "/api/auth/session/refresh";
const SESSION_PATH = "/api/auth/session";

const expiredCopy =
    getDictionary().dictionary.packages.auth.provider.session.expired;

const fetchMock = vi.fn();

type StubbedResponse = { ok: boolean; status: number; body?: unknown };
type StubbedOutcome = StubbedResponse | Error;

function respond(stub: StubbedResponse): Promise<Response> {
    return Promise.resolve({
        ok: stub.ok,
        status: stub.status,
        json: () => Promise.resolve(stub.body ?? {}),
    } as Response);
}

function givenServer(routes: {
    refresh: StubbedOutcome;
    session?: StubbedOutcome;
}) {
    fetchMock.mockImplementation((url: string) => {
        const outcome = String(url).endsWith(REFRESH_PATH)
            ? routes.refresh
            : (routes.session ?? { ok: true, status: STATUS_OK });
        return outcome instanceof Error
            ? Promise.reject(outcome)
            : respond(outcome);
    });
}

function sessionCalls(): number {
    return fetchMock.mock.calls.filter(
        ([url]) =>
            String(url).endsWith(SESSION_PATH) &&
            !String(url).endsWith(REFRESH_PATH)
    ).length;
}

function unauthorized(code: string): StubbedResponse {
    return {
        ok: false,
        status: STATUS_UNAUTHORIZED,
        body: { error: { code } },
    };
}

function renderProvider() {
    const queryClient = new QueryClient({
        defaultOptions: {
            mutations: { retry: false },
            queries: { retry: false },
        },
    });
    render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider>{null}</AuthProvider>
        </QueryClientProvider>
    );
}

async function emitSignedInUser(times = ONE_CALL) {
    const firebaseUser = {
        getIdToken: () => Promise.resolve(ID_TOKEN),
    } as unknown as User;
    await act(async () => {
        for (let round = 0; round < times; round += 1) {
            for (const listener of [...subscribers]) {
                listener(firebaseUser);
            }
        }
        await Promise.resolve();
    });
}

beforeEach(() => {
    cleanup();
    subscribers.length = 0;
    fetchMock.mockReset();
    errorAlertMock.mockReset();
    successAlertMock.mockReset();
    logoutMock.mockReset();
    pushMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState({}, "", CURRENT_PATH);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

/**
 * A user coming back after the absolute lifetime is over arrives with no cookie, so
 * the refresh answers `AUTH_NO_SESSION` and the provider falls back to minting a new
 * cookie — which the server refuses with `AUTH_SESSION_EXPIRED`. Ignoring that refusal
 * left a signed-in Firebase user with no cookie: every screen kept navigating to the
 * authenticated area, the proxy kept bouncing it back to sign-in, and the login form
 * never rendered.
 */
describe("sessão recusada em definitivo", () => {
    it("desloga quando a gravação do cookie responde 401 AUTH_SESSION_EXPIRED", async () => {
        givenServer({
            refresh: unauthorized("AUTH_NO_SESSION"),
            session: unauthorized("AUTH_SESSION_EXPIRED"),
        });
        renderProvider();

        await emitSignedInUser();

        await waitFor(() => {
            expect(logoutMock).toHaveBeenCalledTimes(ONE_CALL);
        });
        expect(errorAlertMock).toHaveBeenCalledWith(expiredCopy);
        expect(pushMock).toHaveBeenCalledWith(SIGN_IN_WITH_REDIRECT);
    });

    it("desloga quando a renovação responde 401 AUTH_SESSION_EXPIRED", async () => {
        givenServer({ refresh: unauthorized("AUTH_SESSION_EXPIRED") });
        renderProvider();

        await emitSignedInUser();

        await waitFor(() => {
            expect(logoutMock).toHaveBeenCalledTimes(ONE_CALL);
        });
        expect(errorAlertMock).toHaveBeenCalledWith(expiredCopy);
        expect(pushMock).toHaveBeenCalledWith(SIGN_IN_WITH_REDIRECT);
        expect(sessionCalls()).toBe(0);
    });

    it("preserva o destino do proxy quando a recusa chega já na tela de login", async () => {
        window.history.pushState({}, "", SIGN_IN_WITH_REDIRECT);
        givenServer({
            refresh: unauthorized("AUTH_NO_SESSION"),
            session: unauthorized("AUTH_SESSION_EXPIRED"),
        });
        renderProvider();

        await emitSignedInUser();

        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith(SIGN_IN_WITH_REDIRECT);
        });
    });

    it("descarta um destino de outra origem em vez de repassá-lo", async () => {
        window.history.pushState({}, "", SIGN_IN_WITH_FOREIGN_REDIRECT);
        givenServer({
            refresh: unauthorized("AUTH_NO_SESSION"),
            session: unauthorized("AUTH_SESSION_EXPIRED"),
        });
        renderProvider();

        await emitSignedInUser();

        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith(SIGN_IN_PATH);
        });
    });

    it("avisa uma única vez quando dois callbacks recebem a mesma recusa", async () => {
        const TWO_ROUNDS = 2;
        givenServer({ refresh: unauthorized("AUTH_SESSION_EXPIRED") });
        renderProvider();

        await emitSignedInUser(TWO_ROUNDS);

        await waitFor(() => {
            expect(errorAlertMock).toHaveBeenCalledTimes(ONE_CALL);
        });
        expect(logoutMock).toHaveBeenCalledTimes(ONE_CALL);
        expect(pushMock).toHaveBeenCalledTimes(ONE_CALL);
    });
});

describe("falha em renovar não desloga ninguém", () => {
    it("mantém a sessão quando a rota responde 500", async () => {
        givenServer({
            refresh: { ok: false, status: STATUS_SERVER_ERROR },
        });
        renderProvider();

        await emitSignedInUser();

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalled();
        });
        expect(logoutMock).not.toHaveBeenCalled();
        expect(errorAlertMock).not.toHaveBeenCalled();
        expect(pushMock).not.toHaveBeenCalled();
    });

    it("mantém a sessão quando a rota não responde", async () => {
        givenServer({ refresh: new Error("network down") });
        renderProvider();

        await emitSignedInUser();

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalled();
        });
        expect(logoutMock).not.toHaveBeenCalled();
        expect(errorAlertMock).not.toHaveBeenCalled();
        expect(pushMock).not.toHaveBeenCalled();
    });

    it("não regrava o cookie quando a renovação é dispensada pelo limiar", async () => {
        givenServer({
            refresh: {
                ok: true,
                status: STATUS_OK,
                body: { refreshed: false },
            },
        });
        renderProvider();

        await emitSignedInUser();

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalled();
        });
        expect(sessionCalls()).toBe(0);
        expect(logoutMock).not.toHaveBeenCalled();
        expect(errorAlertMock).not.toHaveBeenCalled();
    });
});
