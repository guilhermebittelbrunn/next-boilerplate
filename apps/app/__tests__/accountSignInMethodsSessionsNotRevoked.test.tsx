import { globalTranslations } from "@repo/internationalization/translations/global";
import type { AccountDTO } from "@repo/sdk/src/types";
import { setCookie } from "@repo/shared/utils/helpers/cookies";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { REQUEST_ID_HEADER } from "@repo/shared/utils/helpers/request-id";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/shared/lib/queryKeys";

const { unlinkMock, successAlertMock, errorAlertMock, signOutMutateMock } =
    vi.hoisted(() => ({
        unlinkMock: vi.fn(),
        successAlertMock: vi.fn(),
        errorAlertMock: vi.fn(),
        signOutMutateMock: vi.fn(),
    }));

vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => ({ isImpersonating: false }),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({ signOut: { mutate: signOutMutateMock } }),
}));

vi.mock("@repo/auth/client", () => ({
    linkGoogle: vi.fn(),
    reauthenticateWithGoogle: vi.fn(),
    reloadCurrentUser: vi.fn(),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        account: {
            confirmSignInMethodLinked: vi.fn(),
            unlinkSignInMethod: (...args: unknown[]) => unlinkMock(...args),
            setPassword: vi.fn(),
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
    useParams: () => ({}),
}));

const { AccountSignInMethodsPanel } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSignInMethodsPanel"
);

const LOCALES = ["pt-br", "en", "es"] as const;
const ONE_HOUR_IN_SECONDS = 3600;

const REQUEST_ID = "req-unlink-1";

function apiError(code: string): AxiosError {
    const config = { headers: new AxiosHeaders() };
    return new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, {}, {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        statusText: "Internal Server Error",
        headers: new AxiosHeaders({ [REQUEST_ID_HEADER]: REQUEST_ID }),
        config,
        data: { error: { code } },
    } as never);
}

function passwordAndGoogle(): AccountDTO {
    return {
        providerData: ["password", "google.com"].map((providerId) => ({
            providerId,
            uid: `${providerId}-uid`,
            displayName: null,
            email: null,
            phoneNumber: null,
        })),
    } as unknown as AccountDTO;
}

beforeEach(() => {
    for (const mock of [
        unlinkMock,
        successAlertMock,
        errorAlertMock,
        signOutMutateMock,
    ]) {
        mock.mockReset();
    }
    unlinkMock.mockRejectedValue(apiError("AUTH_SESSIONS_NOT_REVOKED"));
});

afterEach(cleanup);

describe("AccountSignInMethodsPanel when the password is unlinked but the sessions stay open", () => {
    it.each(LOCALES)(
        "keeps the session, refreshes the account and shows the message in %s",
        async (locale) => {
            setCookie("x-locale", locale, ONE_HOUR_IN_SECONDS);
            const methodsCopy =
                globalTranslations[locale].apps.app.pages.common.account
                    .security.signInMethods;
            const queryClient = new QueryClient({
                defaultOptions: { mutations: { retry: false } },
            });
            const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
            render(
                <QueryClientProvider client={queryClient}>
                    <AccountSignInMethodsPanel account={passwordAndGoogle()} />
                </QueryClientProvider>
            );

            fireEvent.click(
                screen.getByRole("button", {
                    name: methodsCopy.unlinkAriaLabel.replace(
                        "{method}",
                        methodsCopy.methods.password
                    ),
                })
            );
            fireEvent.click(
                screen.getByRole("button", {
                    name: methodsCopy.unlinkDialog.confirm,
                })
            );

            const unlinkedMessage =
                globalTranslations[locale].apps.app.pages.common.account
                    .messages.passwordUnlinkedSessionsNotRevoked;
            await waitFor(() =>
                expect(errorAlertMock).toHaveBeenCalledWith(unlinkedMessage)
            );
            expect(errorAlertMock).toHaveBeenCalledTimes(1);
            expect(unlinkedMessage).not.toContain(REQUEST_ID);
            expect(unlinkedMessage).toContain(
                globalTranslations[locale].apps.app.pages.common.account
                    .security.signOutEverywhere
            );
            expect(unlinkMock).toHaveBeenCalledTimes(1);
            expect(unlinkMock).toHaveBeenCalledWith("password");
            expect(invalidateSpy).toHaveBeenCalledWith({
                queryKey: queryKeys.account.me(),
            });
            expect(signOutMutateMock).not.toHaveBeenCalled();
            expect(successAlertMock).not.toHaveBeenCalled();
        }
    );
});

describe("AccountSignInMethodsPanel when unlinking the password fails for another reason", () => {
    it("keeps showing the API error copy with the request id", async () => {
        setCookie("x-locale", "pt-br", ONE_HOUR_IN_SECONDS);
        unlinkMock.mockRejectedValue(apiError("ACCOUNT_UPDATE_FAILED"));
        const methodsCopy =
            globalTranslations["pt-br"].apps.app.pages.common.account.security
                .signInMethods;
        const queryClient = new QueryClient({
            defaultOptions: { mutations: { retry: false } },
        });
        render(
            <QueryClientProvider client={queryClient}>
                <AccountSignInMethodsPanel account={passwordAndGoogle()} />
            </QueryClientProvider>
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: methodsCopy.unlinkAriaLabel.replace(
                    "{method}",
                    methodsCopy.methods.password
                ),
            })
        );
        fireEvent.click(
            screen.getByRole("button", {
                name: methodsCopy.unlinkDialog.confirm,
            })
        );

        const utilsCopy = globalTranslations["pt-br"].packages.utils;
        await waitFor(() =>
            expect(errorAlertMock).toHaveBeenCalledWith(
                `${utilsCopy.apiErrors.ACCOUNT_UPDATE_FAILED} (${utilsCopy.error.requestIdLabel}: ${REQUEST_ID})`
            )
        );
        expect(errorAlertMock).toHaveBeenCalledTimes(1);
        expect(successAlertMock).not.toHaveBeenCalled();
    });
});

describe("AccountSignInMethodsPanel when the Google unlink reports sessions not revoked", () => {
    it.each(LOCALES)(
        "shows the generic API error copy, not the password message, in %s",
        async (locale) => {
            setCookie("x-locale", locale, ONE_HOUR_IN_SECONDS);
            const accountCopy =
                globalTranslations[locale].apps.app.pages.common.account;
            const methodsCopy = accountCopy.security.signInMethods;
            const queryClient = new QueryClient({
                defaultOptions: { mutations: { retry: false } },
            });
            render(
                <QueryClientProvider client={queryClient}>
                    <AccountSignInMethodsPanel account={passwordAndGoogle()} />
                </QueryClientProvider>
            );

            fireEvent.click(
                screen.getByRole("button", {
                    name: methodsCopy.unlinkAriaLabel.replace(
                        "{method}",
                        methodsCopy.methods.google
                    ),
                })
            );
            fireEvent.click(
                screen.getByRole("button", {
                    name: methodsCopy.unlinkDialog.confirm,
                })
            );

            const utilsCopy = globalTranslations[locale].packages.utils;
            await waitFor(() =>
                expect(errorAlertMock).toHaveBeenCalledWith(
                    `${utilsCopy.apiErrors.AUTH_SESSIONS_NOT_REVOKED} (${utilsCopy.error.requestIdLabel}: ${REQUEST_ID})`
                )
            );
            expect(errorAlertMock).toHaveBeenCalledTimes(1);
            expect(errorAlertMock).not.toHaveBeenCalledWith(
                accountCopy.messages.passwordUnlinkedSessionsNotRevoked
            );
            expect(unlinkMock).toHaveBeenCalledWith("google.com");
            expect(signOutMutateMock).not.toHaveBeenCalled();
            expect(successAlertMock).not.toHaveBeenCalled();
        }
    );
});
