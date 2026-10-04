import { globalTranslations } from "@repo/internationalization/translations/global";
import type { UserWithAuthDTO } from "@repo/sdk/src/types";
import { setCookie } from "@repo/shared/utils/helpers/cookies";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/shared/lib/queryKeys";

const { updateMock, deleteMock, errorAlertMock } = vi.hoisted(() => ({
    updateMock: vi.fn(),
    deleteMock: vi.fn(),
    errorAlertMock: vi.fn(),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        user: {
            update: (...args: unknown[]) => updateMock(...args),
            delete: (...args: unknown[]) => deleteMock(...args),
        },
    },
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({ successAlert: vi.fn(), errorAlert: errorAlertMock }),
}));

const { useUserCrud } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(hooks)/useUserCrud"
);

const LOCALES = ["pt-br", "en", "es"] as const;
const ONE_HOUR_IN_SECONDS = 3600;

function selfLockoutError(): AxiosError {
    const headers = new AxiosHeaders();
    const config = { headers };
    return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
        status: HTTP_STATUS.FORBIDDEN,
        statusText: "Forbidden",
        headers: new AxiosHeaders(),
        config,
        data: { error: { code: "USERS_SELF_LOCKOUT_FORBIDDEN" } },
    } as never);
}

function ownRow(): UserWithAuthDTO {
    return {
        id: "profile-admin",
        uid: "uid-admin",
        disabled: false,
    } as UserWithAuthDTO;
}

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

beforeEach(() => {
    queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    queryClient.setQueryData(queryKeys.users.list(), [ownRow()]);
    updateMock.mockReset();
    deleteMock.mockReset();
    errorAlertMock.mockReset();
});

describe("useUserCrud when the API refuses a self-lockout", () => {
    it.each(LOCALES)(
        "rolls the status toggle back and shows the refusal in %s",
        async (locale) => {
            setCookie("x-locale", locale, ONE_HOUR_IN_SECONDS);
            updateMock.mockRejectedValue(selfLockoutError());
            const { result } = renderHook(() => useUserCrud(), { wrapper });

            result.current.toggleUserStatusMutation.mutate({
                id: "profile-admin",
                disabled: true,
            });

            await waitFor(() =>
                expect(result.current.toggleUserStatusMutation.isError).toBe(
                    true
                )
            );
            expect(
                queryClient.getQueryData<UserWithAuthDTO[]>(
                    queryKeys.users.list()
                )
            ).toEqual([ownRow()]);
            expect(errorAlertMock).toHaveBeenCalledWith(
                globalTranslations[locale].packages.utils.apiErrors
                    .USERS_SELF_LOCKOUT_FORBIDDEN
            );
        }
    );

    it("shows the refusal when archiving the own account", async () => {
        setCookie("x-locale", "pt-br", ONE_HOUR_IN_SECONDS);
        deleteMock.mockRejectedValue(selfLockoutError());
        const { result } = renderHook(() => useUserCrud(), { wrapper });

        result.current.deleteUserMutation.mutate("profile-admin");

        await waitFor(() =>
            expect(result.current.deleteUserMutation.isError).toBe(true)
        );
        expect(errorAlertMock).toHaveBeenCalledWith(
            globalTranslations["pt-br"].packages.utils.apiErrors
                .USERS_SELF_LOCKOUT_FORBIDDEN
        );
        expect(
            queryClient.getQueryData<UserWithAuthDTO[]>(queryKeys.users.list())
        ).toEqual([ownRow()]);
    });
});
