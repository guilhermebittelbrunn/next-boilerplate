import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAccountDataRights } from "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useAccountDataRights";

const {
    exportDataMock,
    deleteAccountMock,
    signOutMutateMock,
    downloadJsonFileMock,
    successAlertMock,
    errorAlertMock,
    getCookieMock,
} = vi.hoisted(() => ({
    exportDataMock: vi.fn(),
    deleteAccountMock: vi.fn(),
    signOutMutateMock: vi.fn(),
    downloadJsonFileMock: vi.fn(),
    successAlertMock: vi.fn(),
    errorAlertMock: vi.fn(),
    getCookieMock: vi.fn(),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        account: {
            exportData: (...args: unknown[]) => exportDataMock(...args),
            deleteAccount: (...args: unknown[]) => deleteAccountMock(...args),
        },
    },
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({ signOut: { mutate: signOutMutateMock } }),
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({
        successAlert: successAlertMock,
        errorAlert: errorAlertMock,
    }),
}));

vi.mock("@repo/shared/utils", () => ({
    getCookie: (...args: unknown[]) => getCookieMock(...args),
}));

vi.mock("@/shared/lib/downloadJsonFile", () => ({
    buildExportFileName: (prefix: string) => `${prefix}-2026-09-23.json`,
    downloadJsonFile: (...args: unknown[]) => downloadJsonFileMock(...args),
}));

vi.mock("@repo/shared/utils/helpers/handleClientError", () => ({
    handleClientError: () => "erro traduzido",
}));

const PAYLOAD = {
    generatedAt: "2026-09-23T20:14:00.000Z",
    format: { name: "account-data-export", version: 1 },
    subject: { profileId: "profile-1", uid: "common-9" },
    account: { id: "profile-1" },
    records: { entities: [], truncated: false },
    auditEvents: { items: [], truncated: false },
    storageObjects: [],
};

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
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
    exportDataMock.mockResolvedValue(PAYLOAD);
    deleteAccountMock.mockResolvedValue({ confirmed: true });
    getCookieMock.mockReturnValue("v1:analytics=granted");
});

describe("useAccountDataRights — exportação", () => {
    it("monta o arquivo no cliente com o dossiê que a API devolveu", async () => {
        const { result } = renderHook(() => useAccountDataRights(), {
            wrapper,
        });

        result.current.exportDataMutation.mutate();

        await waitFor(() => expect(downloadJsonFileMock).toHaveBeenCalled());
        const [filename, contents] = downloadJsonFileMock.mock.calls[0] as [
            string,
            Record<string, unknown>,
        ];

        expect(filename).toBe("account-data-export-2026-09-23.json");
        expect(contents.subject).toEqual(PAYLOAD.subject);
    });

    it("acrescenta o consentimento de cookie lido daquele navegador", async () => {
        const { result } = renderHook(() => useAccountDataRights(), {
            wrapper,
        });

        result.current.exportDataMutation.mutate();

        await waitFor(() => expect(downloadJsonFileMock).toHaveBeenCalled());
        const [, contents] = downloadJsonFileMock.mock.calls[0] as [
            string,
            { cookieConsent: Record<string, unknown> },
        ];

        expect(contents.cookieConsent).toEqual({
            source: "browser-cookie",
            cookieName: "bp:cookie-consent",
            decision: { decided: true, analytics: true },
        });
    });

    it("não baixa arquivo nenhum quando a API recusa", async () => {
        exportDataMock.mockRejectedValue(new Error("403"));
        const { result } = renderHook(() => useAccountDataRights(), {
            wrapper,
        });

        result.current.exportDataMutation.mutate();

        await waitFor(() => expect(errorAlertMock).toHaveBeenCalled());
        expect(downloadJsonFileMock).not.toHaveBeenCalled();
    });
});

describe("useAccountDataRights — exclusão", () => {
    it("desloga o navegador quando a exclusão confirma", async () => {
        const { result } = renderHook(() => useAccountDataRights(), {
            wrapper,
        });

        result.current.deleteAccountMutation.mutate({
            currentPassword: "current-secret",
        });

        await waitFor(() => expect(signOutMutateMock).toHaveBeenCalledTimes(1));
        expect(deleteAccountMock).toHaveBeenCalledWith({
            currentPassword: "current-secret",
        });
    });

    it("mantém a sessão quando a senha é recusada", async () => {
        deleteAccountMock.mockRejectedValue(new Error("400"));
        const { result } = renderHook(() => useAccountDataRights(), {
            wrapper,
        });

        result.current.deleteAccountMutation.mutate({
            currentPassword: "wrong",
        });

        await waitFor(() => expect(errorAlertMock).toHaveBeenCalled());
        expect(signOutMutateMock).not.toHaveBeenCalled();
    });
});
