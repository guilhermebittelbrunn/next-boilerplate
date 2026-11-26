import { UserRoleLevel } from "@repo/auth/types";
import { globalTranslations } from "@repo/internationalization/translations/global";
import { UserType } from "@repo/sdk/src/types";
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
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listMock, updateMock, errorAlertMock } = vi.hoisted(() => ({
    listMock: vi.fn(),
    updateMock: vi.fn(),
    errorAlertMock: vi.fn(),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        user: {
            list: (...args: unknown[]) => listMock(...args),
            update: (...args: unknown[]) => updateMock(...args),
            delete: vi.fn(),
        },
    },
}));

vi.mock("@/shared/stores/panelStore", () => ({
    usePanelState: (selector: (state: Record<string, unknown>) => unknown) =>
        selector({
            sdkAuthorized: true,
            panelRequestRole: UserRoleLevel.ADMIN,
        }),
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({ successAlert: vi.fn(), errorAlert: errorAlertMock }),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({ user: { uid: "uid-admin" } }),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));

vi.mock("@repo/design-system/components/ui/responsive-image", () => ({
    default: () => <span />,
}));

vi.mock("@repo/design-system/components/ui", () => ({
    AddButton: () => <button type="button">add</button>,
    ActionsMenu: () => <div />,
    Table: <TRow,>({
        columns,
        dataSource,
    }: {
        columns: {
            dataIndex: string;
            render?: (value: unknown, row: TRow) => ReactNode;
        }[];
        dataSource: TRow[];
    }) => (
        <div>
            {dataSource.map((row) => (
                <div key={(row as { id: string }).id}>
                    {columns.map((column) => (
                        <div key={column.dataIndex}>
                            {column.render?.(
                                (row as Record<string, unknown>)[
                                    column.dataIndex
                                ],
                                row
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    ),
}));

const { UsersListClient } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/UsersListClient"
);

const LOCALES = ["pt-br", "en", "es"] as const;
const ONE_HOUR_IN_SECONDS = 3600;
const TARGET_NAME = "Ana";

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

function activeUser() {
    return {
        id: "profile-target",
        uid: "uid-target",
        type: UserType.COMMON,
        email: "ana@example.com",
        displayName: TARGET_NAME,
        photoURL: null,
        disabled: false,
        lastAccessAt: null,
        metadata: { lastRefreshTime: null },
    };
}

function renderList() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <UsersListClient />
        </QueryClientProvider>
    );
}

async function statusSwitch(locale: (typeof LOCALES)[number]) {
    const label = globalTranslations[
        locale
    ].apps.app.pages.admin.users.list.statusToggle.replace(
        "{name}",
        TARGET_NAME
    );
    return (await screen.findByRole("switch", { name: label })) as HTMLElement;
}

async function disableAndFail(
    locale: (typeof LOCALES)[number],
    code: string
): Promise<{ before: string | null; after: string | null }> {
    setCookie("x-locale", locale, ONE_HOUR_IN_SECONDS);
    updateMock.mockRejectedValue(apiError(code));
    renderList();

    const toggle = await statusSwitch(locale);
    const before = toggle.getAttribute("aria-checked");

    fireEvent.click(toggle);

    await waitFor(() => expect(errorAlertMock).toHaveBeenCalledTimes(1));
    const after = (await statusSwitch(locale)).getAttribute("aria-checked");
    return { before, after };
}

beforeEach(() => {
    listMock.mockReset();
    updateMock.mockReset();
    errorAlertMock.mockReset();
    listMock.mockResolvedValue([activeUser()]);
});

afterEach(cleanup);

describe("users list status switch when the API disabled the account but kept its sessions", () => {
    it.each(LOCALES)(
        "stays off and shows the translated message in %s",
        async (locale) => {
            const { before, after } = await disableAndFail(
                locale,
                "USERS_SESSIONS_NOT_REVOKED"
            );

            expect(before).toBe("true");
            expect(after).toBe("false");
            expect(updateMock).toHaveBeenCalledWith({
                id: "profile-target",
                disabled: true,
            });
            expect(errorAlertMock).toHaveBeenCalledWith(
                globalTranslations[locale].packages.utils.apiErrors
                    .USERS_SESSIONS_NOT_REVOKED
            );
            expect(updateMock).toHaveBeenCalledTimes(1);
            expect(listMock).toHaveBeenCalledTimes(1);
        }
    );

    it("switches back on for any other error", async () => {
        const { before, after } = await disableAndFail(
            "pt-br",
            "ACCOUNT_UPDATE_FAILED"
        );

        expect(before).toBe("true");
        expect(after).toBe("true");
    });
});
