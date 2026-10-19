import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    reauthenticateWithGoogleMock,
    reloadCurrentUserMock,
    setPasswordMock,
    unlinkSignInMethodMock,
    successAlertMock,
    errorAlertMock,
} = vi.hoisted(() => ({
    reauthenticateWithGoogleMock: vi.fn(),
    reloadCurrentUserMock: vi.fn(),
    setPasswordMock: vi.fn(),
    unlinkSignInMethodMock: vi.fn(),
    successAlertMock: vi.fn(),
    errorAlertMock: vi.fn(),
}));

vi.mock("@repo/auth/client", () => ({
    linkGoogle: vi.fn(),
    reauthenticateWithGoogle: (...args: unknown[]) =>
        reauthenticateWithGoogleMock(...args),
    reloadCurrentUser: (...args: unknown[]) => reloadCurrentUserMock(...args),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        account: {
            setPassword: (...args: unknown[]) => setPasswordMock(...args),
            confirmSignInMethodLinked: vi.fn(),
            unlinkSignInMethod: (...args: unknown[]) =>
                unlinkSignInMethodMock(...args),
        },
    },
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        errorAlert: errorAlertMock,
        successAlert: successAlertMock,
    }),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));

const { useSignInMethodMutations } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useSignInMethodMutations"
);
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);

const translations = globalTranslations["pt-br"];
const accountMessages = translations.apps.app.pages.common.account.messages;
const firebaseErrors = translations.packages.auth.provider.firebase.error;
const apiErrors = translations.packages.utils.apiErrors;

const REAUTH_ID_TOKEN = "fresh-google-id-token";
const NEW_PASSWORD = "brand-new-secret";
const BAD_REQUEST = 400;

function firebaseError(code: string) {
    return Object.assign(new Error(`Firebase: Error (${code}).`), { code });
}

function apiError(code: string): AxiosError {
    const headers = new AxiosHeaders();
    const config = { headers };
    return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
        status: BAD_REQUEST,
        statusText: "Bad Request",
        headers,
        config,
        data: { error: { code } },
    } as never);
}

function renderMutations() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
    return renderHook(() => useSignInMethodMutations(), { wrapper });
}

async function setPassword() {
    const { result } = renderMutations();
    act(() => {
        result.current.setPasswordMutation.mutate(NEW_PASSWORD);
    });
    await waitFor(() =>
        expect(result.current.setPasswordMutation.isPending).toBe(false)
    );
    return result;
}

beforeEach(() => {
    vi.clearAllMocks();
    reauthenticateWithGoogleMock.mockResolvedValue(REAUTH_ID_TOKEN);
    setPasswordMock.mockResolvedValue({ confirmed: true });
    unlinkSignInMethodMock.mockResolvedValue(undefined);
});

describe("useSignInMethodMutations — definir senha", () => {
    it("reautentica no Google antes de enviar o token novo e a senha à API", async () => {
        const result = await setPassword();

        await waitFor(() =>
            expect(result.current.setPasswordMutation.isSuccess).toBe(true)
        );
        expect(setPasswordMock).toHaveBeenCalledWith({
            reauthIdToken: REAUTH_ID_TOKEN,
            password: NEW_PASSWORD,
        });
        expect(
            reauthenticateWithGoogleMock.mock.invocationCallOrder[0]
        ).toBeLessThan(setPasswordMock.mock.invocationCallOrder[0] ?? 0);
        expect(successAlertMock).toHaveBeenCalledWith(
            accountMessages.passwordSet
        );
        expect(errorAlertMock).not.toHaveBeenCalled();
    });

    it.each(["auth/popup-closed-by-user", "auth/cancelled-popup-request"])(
        "fechar o popup (%s) não chama a API nem abre alerta",
        async (code) => {
            reauthenticateWithGoogleMock.mockRejectedValue(firebaseError(code));

            const result = await setPassword();

            await waitFor(() =>
                expect(result.current.setPasswordMutation.isError).toBe(true)
            );
            expect(setPasswordMock).not.toHaveBeenCalled();
            expect(errorAlertMock).not.toHaveBeenCalled();
            expect(successAlertMock).not.toHaveBeenCalled();
        }
    );

    it.each(["auth/user-mismatch", "auth/popup-blocked"] as const)(
        "traduz %s e não chama a API",
        async (code) => {
            reauthenticateWithGoogleMock.mockRejectedValue(firebaseError(code));

            await setPassword();

            await waitFor(() =>
                expect(errorAlertMock).toHaveBeenCalledWith(
                    firebaseErrors[code]
                )
            );
            expect(setPasswordMock).not.toHaveBeenCalled();
            expect(successAlertMock).not.toHaveBeenCalled();
        }
    );

    it.each([
        "ACCOUNT_REAUTH_INVALID",
        "ACCOUNT_PASSWORD_ALREADY_SET",
    ] as const)(
        "mostra a copy de %s quando a API recusa a senha",
        async (code) => {
            setPasswordMock.mockRejectedValue(apiError(code));

            await setPassword();

            await waitFor(() =>
                expect(errorAlertMock).toHaveBeenCalledWith(apiErrors[code])
            );
            expect(successAlertMock).not.toHaveBeenCalled();
        }
    );
});

describe("useSignInMethodMutations — desvincular", () => {
    it("com o 204 da API, mostra sucesso mesmo se o Firebase do navegador estiver fora", async () => {
        reloadCurrentUserMock.mockRejectedValue(
            firebaseError("auth/network-request-failed")
        );
        const { result } = renderMutations();

        act(() => {
            result.current.unlinkMutation.mutate("google.com");
        });

        await waitFor(() =>
            expect(result.current.unlinkMutation.isSuccess).toBe(true)
        );
        expect(unlinkSignInMethodMock).toHaveBeenCalledWith("google.com");
        expect(successAlertMock).toHaveBeenCalledWith(
            accountMessages.signInMethodUnlinked
        );
        expect(errorAlertMock).not.toHaveBeenCalled();
    });
});
