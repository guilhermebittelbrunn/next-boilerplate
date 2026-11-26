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

const { updateMock, errorAlertMock } = vi.hoisted(() => ({
    updateMock: vi.fn(),
    errorAlertMock: vi.fn(),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        user: {
            update: (...args: unknown[]) => updateMock(...args),
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
const USER_ID = "profile-target";

function apiError(code: string): AxiosError {
    const config = { headers: new AxiosHeaders() };
    return new AxiosError("Request failed", "ERR_BAD_RESPONSE", config, {}, {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        statusText: "Internal Server Error",
        headers: new AxiosHeaders(),
        config,
        data: { error: { code } },
    } as never);
}

function activeRow(): UserWithAuthDTO {
    return {
        id: USER_ID,
        uid: "uid-target",
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

function cachedList() {
    return queryClient.getQueryData<UserWithAuthDTO[]>(queryKeys.users.list());
}

function cachedDetail() {
    return queryClient.getQueryData<UserWithAuthDTO>(
        queryKeys.users.detail(USER_ID)
    );
}

async function disableAndFail(code: string) {
    updateMock.mockRejectedValue(apiError(code));
    const { result } = renderHook(() => useUserCrud(), { wrapper });

    result.current.toggleUserStatusMutation.mutate({
        id: USER_ID,
        disabled: true,
    });

    await waitFor(() =>
        expect(result.current.toggleUserStatusMutation.isError).toBe(true)
    );
}

beforeEach(() => {
    queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    queryClient.setQueryData(queryKeys.users.list(), [activeRow()]);
    queryClient.setQueryData(queryKeys.users.detail(USER_ID), activeRow());
    updateMock.mockReset();
    errorAlertMock.mockReset();
});

describe("useUserCrud when disabling succeeds but the sessions stay open", () => {
    it.each(LOCALES)(
        "keeps the account shown as disabled and shows the message in %s",
        async (locale) => {
            setCookie("x-locale", locale, ONE_HOUR_IN_SECONDS);

            await disableAndFail("USERS_SESSIONS_NOT_REVOKED");

            expect(cachedList()).toEqual([{ ...activeRow(), disabled: true }]);
            expect(cachedDetail()).toEqual({ ...activeRow(), disabled: true });
            expect(errorAlertMock).toHaveBeenCalledWith(
                globalTranslations[locale].packages.utils.apiErrors
                    .USERS_SESSIONS_NOT_REVOKED
            );
        }
    );

    it("rolls the toggle back for any other error", async () => {
        setCookie("x-locale", "pt-br", ONE_HOUR_IN_SECONDS);

        await disableAndFail("ACCOUNT_UPDATE_FAILED");

        expect(cachedList()).toEqual([activeRow()]);
        expect(cachedDetail()).toEqual(activeRow());
        expect(errorAlertMock).toHaveBeenCalledTimes(1);
    });
});
