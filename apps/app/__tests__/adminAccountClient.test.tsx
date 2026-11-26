import type { AccountDTO } from "@repo/sdk/src/types";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useMyAccountMock, accountTabsPropsMock, headerPropsMock } = vi.hoisted(
    () => ({
        useMyAccountMock: vi.fn(),
        accountTabsPropsMock: vi.fn(),
        headerPropsMock: vi.fn(),
    })
);

vi.mock("@/shared/hooks/useMyAccount", () => ({
    useMyAccount: () => useMyAccountMock(),
}));

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs",
    () => ({
        AccountTabs: (props: {
            account: AccountDTO | undefined;
            area?: string;
        }) => {
            accountTabsPropsMock(props);
            return <div>account-tabs</div>;
        },
    })
);

vi.mock("@/shared/components/ui/Header", () => ({
    Header: (props: {
        breadcrumbs: { label: string; href: string }[];
        page: string;
    }) => {
        headerPropsMock(props);
        return null;
    },
}));

vi.mock("@/shared/components/ui/Container", () => ({
    Container: ({
        children,
        loading,
        loadError,
    }: {
        children: ReactNode;
        loading?: boolean;
        loadError?: string | null;
    }) => {
        if (loadError) {
            return <div>{loadError}</div>;
        }
        if (loading) {
            return <div>carregando</div>;
        }
        return <div>{children}</div>;
    },
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
}));

const { AdminAccountClient } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/AdminAccountClient"
);
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);

const ADMIN_ROOT_PATH = /\/admin$/;
const ptBr = globalTranslations["pt-br"].apps.app.pages;
const ADMIN_ACCOUNT = {
    displayName: "Admin",
    email: "admin@example.com",
} as unknown as AccountDTO;

beforeEach(() => {
    vi.clearAllMocks();
    useMyAccountMock.mockReturnValue({
        data: ADMIN_ACCOUNT,
        isLoading: false,
        isError: false,
    });
});

afterEach(cleanup);

describe("AdminAccountClient", () => {
    it("monta as abas da conta na área do admin com a conta carregada", () => {
        render(<AdminAccountClient />);

        expect(screen.getByText("account-tabs")).toBeTruthy();
        expect(accountTabsPropsMock).toHaveBeenLastCalledWith({
            account: ADMIN_ACCOUNT,
            area: "admin",
        });
    });

    it("aponta o breadcrumb para a raiz do painel admin", () => {
        render(<AdminAccountClient />);

        const headerProps = headerPropsMock.mock.lastCall?.[0];
        expect(headerProps?.page).toBe(ptBr.common.account.title);
        expect(headerProps?.breadcrumbs).toHaveLength(1);
        expect(headerProps?.breadcrumbs[0]).toMatchObject({
            label: ptBr.admin.routes.administration,
        });
        expect(headerProps?.breadcrumbs[0]?.href).toMatch(ADMIN_ROOT_PATH);
    });

    it("troca as abas pela mensagem traduzida quando a conta não carrega", () => {
        useMyAccountMock.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
        });

        render(<AdminAccountClient />);

        expect(
            screen.getByText(ptBr.common.account.messages.loadError)
        ).toBeTruthy();
        expect(screen.queryByText("account-tabs")).toBeNull();
    });
});
