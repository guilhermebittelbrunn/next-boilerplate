import { UserRoleLevel } from "@repo/auth/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    listSessionsMock,
    revokeSessionMock,
    revokeOtherSessionsMock,
    successAlertMock,
    errorAlertMock,
} = vi.hoisted(() => ({
    listSessionsMock: vi.fn(),
    revokeSessionMock: vi.fn(),
    revokeOtherSessionsMock: vi.fn(),
    successAlertMock: vi.fn(),
    errorAlertMock: vi.fn(),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        account: {
            listSessions: (...args: unknown[]) => listSessionsMock(...args),
            revokeSession: (...args: unknown[]) => revokeSessionMock(...args),
            revokeOtherSessions: (...args: unknown[]) =>
                revokeOtherSessionsMock(...args),
        },
    },
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        errorAlert: errorAlertMock,
        successAlert: successAlertMock,
    }),
}));

vi.mock("@repo/shared/utils/helpers/handleClientError", () => ({
    handleClientError: (error: { message: string }) =>
        `traduzido: ${error.message}`,
}));

vi.mock("@repo/shared/utils/helpers/formattedError", () => ({
    default: class {
        message: string;
        constructor(error: { code?: string }) {
            this.message = error.code ?? "unknown";
        }
    },
}));

const { useListAccountSessions } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useListAccountSessions"
);
const { useAccountSessionMutations } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useAccountSessionMutations"
);
const { queryKeys } = await import("@/shared/lib/queryKeys");
const { createPanelStore, PanelStoreContext } = await import(
    "@/shared/stores/panelStore"
);
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);

const accountMessages =
    globalTranslations["pt-br"].apps.app.pages.common.account.messages;

const SESSIONS = [
    {
        id: "1790800000",
        current: true,
        browser: "Chrome",
        os: "macOS",
        deviceType: "desktop",
        signedInAt: "2026-09-30T20:26:40.000Z",
        lastSeenAt: "2026-09-30T22:00:00.000Z",
    },
];

let queryClient: QueryClient;
let panelStore: ReturnType<typeof createPanelStore>;

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <PanelStoreContext.Provider value={panelStore}>
                {children}
            </PanelStoreContext.Provider>
        </QueryClientProvider>
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    panelStore = createPanelStore({
        profileKind: "common",
        panelRequestRole: UserRoleLevel.COMMON,
        impersonatedFirebaseUid: null,
    });
    panelStore.getState().setSdkAuthorized(true);
    listSessionsMock.mockResolvedValue(SESSIONS);
    revokeSessionMock.mockResolvedValue(undefined);
    revokeOtherSessionsMock.mockResolvedValue({ revoked: 2 });
});

describe("useListAccountSessions", () => {
    it("guarda a lista na chave de sessões da conta", async () => {
        const { result } = renderHook(() => useListAccountSessions(), {
            wrapper,
        });

        await waitFor(() => expect(result.current.data).toEqual(SESSIONS));
        expect(queryClient.getQueryData(queryKeys.account.sessions())).toEqual(
            SESSIONS
        );
    });

    it("não pede a lista antes de o SDK carregar o token", async () => {
        panelStore.getState().setSdkAuthorized(false);

        renderHook(() => useListAccountSessions(), { wrapper });

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(listSessionsMock).not.toHaveBeenCalled();
    });
});

describe("useAccountSessionMutations", () => {
    it("encerra uma sessão, avisa e recarrega a lista", async () => {
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useAccountSessionMutations(), {
            wrapper,
        });

        result.current.revokeSessionMutation.mutate("1790500000");

        await waitFor(() =>
            expect(successAlertMock).toHaveBeenCalledWith(
                accountMessages.sessionRevoked
            )
        );
        expect(revokeSessionMock).toHaveBeenCalledWith("1790500000");
        expect(invalidate).toHaveBeenCalledWith({
            queryKey: queryKeys.account.sessions(),
        });
    });

    it("encerra as outras, avisa e recarrega a lista", async () => {
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");
        const { result } = renderHook(() => useAccountSessionMutations(), {
            wrapper,
        });

        result.current.revokeOtherSessionsMutation.mutate();

        await waitFor(() =>
            expect(successAlertMock).toHaveBeenCalledWith(
                accountMessages.otherSessionsRevoked
            )
        );
        expect(invalidate).toHaveBeenCalledWith({
            queryKey: queryKeys.account.sessions(),
        });
    });

    it("leva o erro traduzido ao aviso de erro", async () => {
        revokeSessionMock.mockRejectedValue({
            code: "ACCOUNT_SESSION_IS_CURRENT",
        });
        const { result } = renderHook(() => useAccountSessionMutations(), {
            wrapper,
        });

        result.current.revokeSessionMutation.mutate("1790800000");

        await waitFor(() =>
            expect(errorAlertMock).toHaveBeenCalledWith(
                "traduzido: ACCOUNT_SESSION_IS_CURRENT"
            )
        );
        expect(successAlertMock).not.toHaveBeenCalled();
    });
});
