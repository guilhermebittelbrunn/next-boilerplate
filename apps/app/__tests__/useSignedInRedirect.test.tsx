import {
    QueryClient,
    QueryClientProvider,
    useMutation,
} from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FakeUser = { getIdToken: () => Promise<string> };

const { authState, logoutMock, postLoginPathMock } = vi.hoisted(() => ({
    authState: { loading: false, user: null as FakeUser | null },
    logoutMock: vi.fn(),
    postLoginPathMock: vi.fn(),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({ loading: authState.loading, user: authState.user }),
}));

vi.mock("@repo/auth/client", () => ({
    logout: () => logoutMock(),
}));

vi.mock("@repo/internationalization/client", () => ({
    getDictionary: () => ({ dictionary: {}, locale: "en" }),
}));

vi.mock("@/shared/lib/postLoginNavigation", () => ({
    resolveAppPostLoginPath: (...args: unknown[]) => postLoginPathMock(...args),
}));

const { useSignedInRedirect } = await import(
    "@/shared/hooks/useSignedInRedirect"
);

const STATUS_OK = 200;
const STATUS_BAD_REQUEST = 400;
const STATUS_UNAUTHORIZED = 401;
const STATUS_FORBIDDEN = 403;
const STATUS_INTERNAL_ERROR = 500;
const ID_TOKEN = "id-token";
const DESTINATION = "/en/entities";

const fetchMock = vi.fn();
const replaceMock = vi.fn();
const originalLocation = window.location;

function signedInUser(): FakeUser {
    return { getIdToken: () => Promise.resolve(ID_TOKEN) };
}

function sessionResponse(status: number) {
    return {
        ok: status === STATUS_OK,
        status,
        json: () => Promise.resolve({}),
    } as Response;
}

function renderRedirect<T>(callback: () => T = () => undefined as T) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
    return renderHook(
        () => {
            useSignedInRedirect();
            return callback();
        },
        { wrapper }
    );
}

async function settle() {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
}

beforeEach(() => {
    cleanup();
    authState.loading = false;
    authState.user = null;
    fetchMock.mockReset();
    replaceMock.mockReset();
    logoutMock.mockReset();
    logoutMock.mockResolvedValue(undefined);
    postLoginPathMock.mockReset();
    postLoginPathMock.mockResolvedValue(DESTINATION);
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(window, "location", {
        configurable: true,
        value: { pathname: "/en/sign-in", replace: replaceMock, search: "" },
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
    });
});

describe("useSignedInRedirect", () => {
    it("navega com o cookie gravado e não desloga", async () => {
        authState.user = signedInUser();
        fetchMock.mockResolvedValue(sessionResponse(STATUS_OK));

        renderRedirect();

        await waitFor(() => {
            expect(replaceMock).toHaveBeenCalledWith(DESTINATION);
        });
        expect(replaceMock).toHaveBeenCalledTimes(1);
        expect(logoutMock).not.toHaveBeenCalled();
        expect(postLoginPathMock).toHaveBeenCalledWith({
            idToken: ID_TOKEN,
            locale: "en",
            fallbackPath: "/en",
        });
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/auth/session",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ idToken: ID_TOKEN }),
            })
        );
    });

    it.each([
        STATUS_UNAUTHORIZED,
        STATUS_FORBIDDEN,
        STATUS_BAD_REQUEST,
        STATUS_INTERNAL_ERROR,
    ])(
        "desloga e fica na tela quando a gravação responde %i",
        async (status) => {
            authState.user = signedInUser();
            fetchMock.mockResolvedValue(sessionResponse(status));

            renderRedirect();

            await waitFor(() => {
                expect(logoutMock).toHaveBeenCalledTimes(1);
            });
            await settle();
            expect(replaceMock).not.toHaveBeenCalled();
            expect(postLoginPathMock).not.toHaveBeenCalled();
        }
    );

    it("desloga e fica na tela quando a requisição nem chega", async () => {
        authState.user = signedInUser();
        fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

        renderRedirect();

        await waitFor(() => {
            expect(logoutMock).toHaveBeenCalledTimes(1);
        });
        await settle();
        expect(replaceMock).not.toHaveBeenCalled();
        expect(postLoginPathMock).not.toHaveBeenCalled();
    });

    it("desloga sem gravar nada quando o ID token não sai", async () => {
        authState.user = {
            getIdToken: () => Promise.reject(new Error("auth/network")),
        };

        renderRedirect();

        await waitFor(() => {
            expect(logoutMock).toHaveBeenCalledTimes(1);
        });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(replaceMock).not.toHaveBeenCalled();
    });

    it("não faz nada enquanto a autenticação carrega", async () => {
        authState.user = signedInUser();
        authState.loading = true;

        renderRedirect();
        await settle();

        expect(fetchMock).not.toHaveBeenCalled();
        expect(logoutMock).not.toHaveBeenCalled();
    });

    it("não faz nada sem usuário", async () => {
        renderRedirect();
        await settle();

        expect(fetchMock).not.toHaveBeenCalled();
        expect(logoutMock).not.toHaveBeenCalled();
    });

    it("deixa a gravação e a navegação para o login que está em andamento nesta tela", async () => {
        fetchMock.mockResolvedValue(sessionResponse(STATUS_FORBIDDEN));

        const { result, rerender } = renderRedirect(() =>
            useMutation({ mutationFn: () => new Promise<never>(() => null) })
        );
        act(() => {
            result.current.mutate();
        });
        authState.user = signedInUser();
        rerender();
        await settle();

        expect(fetchMock).not.toHaveBeenCalled();
        expect(logoutMock).not.toHaveBeenCalled();
        expect(replaceMock).not.toHaveBeenCalled();
    });

    it("não navega nem desloga depois de desmontado", async () => {
        authState.user = signedInUser();
        let answer: ((response: Response) => void) | undefined;
        fetchMock.mockReturnValue(
            new Promise<Response>((resolve) => {
                answer = resolve;
            })
        );

        const { unmount } = renderRedirect();
        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalled();
        });
        unmount();
        answer?.(sessionResponse(STATUS_FORBIDDEN));
        await settle();

        expect(logoutMock).not.toHaveBeenCalled();
        expect(replaceMock).not.toHaveBeenCalled();
    });
});
