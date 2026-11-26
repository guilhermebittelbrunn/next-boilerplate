import { globalTranslations } from "@repo/internationalization/translations/global";
import type { AccountDTO } from "@repo/sdk/src/types";
import { setCookie } from "@repo/shared/utils/helpers/cookies";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
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

function sessionsNotRevokedError(): AxiosError {
    const config = { headers: new AxiosHeaders() };
    return new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, {}, {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        statusText: "Internal Server Error",
        headers: new AxiosHeaders(),
        config,
        data: { error: { code: "AUTH_SESSIONS_NOT_REVOKED" } },
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
    unlinkMock.mockRejectedValue(sessionsNotRevokedError());
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

            await waitFor(() =>
                expect(errorAlertMock).toHaveBeenCalledWith(
                    globalTranslations[locale].packages.utils.apiErrors
                        .AUTH_SESSIONS_NOT_REVOKED
                )
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
