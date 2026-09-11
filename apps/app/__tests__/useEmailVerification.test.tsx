import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    sendEmailVerificationMock,
    confirmEmailVerificationMock,
    reloadCurrentUserMock,
    successAlertMock,
    errorAlertMock,
    handleClientErrorMock,
} = vi.hoisted(() => ({
    sendEmailVerificationMock: vi.fn(),
    confirmEmailVerificationMock: vi.fn(),
    reloadCurrentUserMock: vi.fn(),
    successAlertMock: vi.fn(),
    errorAlertMock: vi.fn(),
    handleClientErrorMock: vi.fn(),
}));

const RESENT_COPY = "Enviamos um link novo para o seu e-mail.";

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        authApi: {
            sendEmailVerification: (...args: unknown[]) =>
                sendEmailVerificationMock(...args),
            confirmEmailVerification: (...args: unknown[]) =>
                confirmEmailVerificationMock(...args),
        },
    },
}));

vi.mock("@repo/auth/client", () => ({
    reloadCurrentUser: (...args: unknown[]) => reloadCurrentUserMock(...args),
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        successAlert: successAlertMock,
        errorAlert: errorAlertMock,
    }),
}));

vi.mock("@repo/internationalization/client", () => ({
    getDictionary: () => ({
        locale: "es",
        dictionary: {
            apps: {
                app: {
                    pages: {
                        emailVerification: {
                            messages: { resent: RESENT_COPY },
                        },
                    },
                },
            },
        },
    }),
}));

vi.mock("@repo/shared/utils/helpers/formattedError", () => ({
    default: class FormattedError {
        error: unknown;
        locale: unknown;
        constructor(error: unknown, locale: unknown) {
            this.error = error;
            this.locale = locale;
        }
    },
}));

vi.mock("@repo/shared/utils/helpers/handleClientError", () => ({
    handleClientError: (...args: unknown[]) => handleClientErrorMock(...args),
}));

const { useEmailVerification } = await import(
    "@/shared/hooks/useEmailVerification"
);

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

function renderUseEmailVerification() {
    return renderHook(() => useEmailVerification(), { wrapper });
}

beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    sendEmailVerificationMock.mockResolvedValue({ requested: true });
    confirmEmailVerificationMock.mockResolvedValue({ confirmed: true });
    reloadCurrentUserMock.mockResolvedValue({ emailVerified: true });
    handleClientErrorMock.mockReturnValue("copy traduzida do error.code");
});

describe("useEmailVerification · resendVerificationMutation", () => {
    it("asks for the resend in the language being browsed", async () => {
        const { result } = renderUseEmailVerification();

        result.current.resendVerificationMutation.mutate();

        await waitFor(() =>
            expect(result.current.resendVerificationMutation.isSuccess).toBe(
                true
            )
        );
        expect(sendEmailVerificationMock).toHaveBeenCalledWith({
            locale: "es",
        });
    });

    it("confirms the resend with copy read from the dictionary", async () => {
        const { result } = renderUseEmailVerification();

        result.current.resendVerificationMutation.mutate();

        await waitFor(() => expect(successAlertMock).toHaveBeenCalled());
        expect(successAlertMock).toHaveBeenCalledWith(RESENT_COPY);
        expect(errorAlertMock).not.toHaveBeenCalled();
    });

    /**
     * The refusals this route answers with are all error codes the user has to read
     * to know what to do next — a throttled provider says "wait", a fork with no
     * mailer says something else entirely — so the code has to reach the screen
     * translated instead of dying in the console.
     */
    it("surfaces a refused resend as translated copy in an alert", async () => {
        const refusal = { error: { code: "EMAIL_SEND_FAILED" } };
        sendEmailVerificationMock.mockRejectedValue(refusal);
        const { result } = renderUseEmailVerification();

        result.current.resendVerificationMutation.mutate();

        await waitFor(() => expect(errorAlertMock).toHaveBeenCalled());
        expect(errorAlertMock).toHaveBeenCalledWith(
            "copy traduzida do error.code"
        );
        expect(successAlertMock).not.toHaveBeenCalled();
        const [formatted] = handleClientErrorMock.mock.calls[0] as [
            { error: unknown; locale: unknown },
        ];
        expect(formatted.error).toBe(refusal);
        expect(formatted.locale).toBe("es");
    });
});

describe("useEmailVerification · confirmVerificationMutation", () => {
    /**
     * The confirmed address lives on the account record, not in the ID token, so a
     * token refresh alone leaves the pending notice on screen. Both halves are
     * needed: re-read the record, then let the listener fire again.
     */
    it("re-reads the account so the pending notice can retire", async () => {
        const { result } = renderUseEmailVerification();

        result.current.confirmVerificationMutation.mutate("real-oob-code");

        await waitFor(() =>
            expect(result.current.confirmVerificationMutation.isSuccess).toBe(
                true
            )
        );
        expect(confirmEmailVerificationMock).toHaveBeenCalledWith({
            oobCode: "real-oob-code",
        });
        expect(reloadCurrentUserMock).toHaveBeenCalledTimes(1);
        expect(result.current.confirmVerificationMutation.data).toEqual({
            confirmed: true,
        });
    });

    /**
     * The action code is already spent once the API answers, so a failure to refresh
     * the session afterwards must not present a confirmation that worked as an
     * error: the user would be sent to ask for a link that can no longer be issued.
     */
    it("still reports success when the session refresh fails", async () => {
        reloadCurrentUserMock.mockRejectedValue(new Error("network down"));
        const { result } = renderUseEmailVerification();

        result.current.confirmVerificationMutation.mutate("real-oob-code");

        await waitFor(() =>
            expect(result.current.confirmVerificationMutation.isSuccess).toBe(
                true
            )
        );
        expect(result.current.confirmVerificationMutation.isError).toBe(false);
        expect(result.current.confirmVerificationMutation.data).toEqual({
            confirmed: true,
        });
    });

    it("does not refresh the session when the action code is refused", async () => {
        confirmEmailVerificationMock.mockRejectedValue({
            error: { code: "AUTH_OOB_CODE_EXPIRED" },
        });
        const { result } = renderUseEmailVerification();

        result.current.confirmVerificationMutation.mutate("stale-code");

        await waitFor(() =>
            expect(result.current.confirmVerificationMutation.isError).toBe(
                true
            )
        );
        expect(reloadCurrentUserMock).not.toHaveBeenCalled();
    });

    /**
     * The screen renders the refusal itself, next to a way out, instead of a toast
     * that scrolls away — so this mutation deliberately has no onError.
     */
    it("leaves the refusal for the screen to render", async () => {
        confirmEmailVerificationMock.mockRejectedValue({
            error: { code: "AUTH_OOB_CODE_INVALID" },
        });
        const { result } = renderUseEmailVerification();

        result.current.confirmVerificationMutation.mutate("garbage");

        await waitFor(() =>
            expect(result.current.confirmVerificationMutation.isError).toBe(
                true
            )
        );
        expect(errorAlertMock).not.toHaveBeenCalled();
    });
});
