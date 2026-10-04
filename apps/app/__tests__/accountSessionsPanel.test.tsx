import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom ships without matchMedia, and the antd table subscribes to it on mount.
window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia;

const {
    panelMock,
    listMock,
    revokeMutateMock,
    revokeOthersMutateMock,
    mutationState,
} = vi.hoisted(() => ({
    panelMock: vi.fn(),
    listMock: vi.fn(),
    revokeMutateMock: vi.fn(),
    revokeOthersMutateMock: vi.fn(),
    mutationState: { pending: false },
}));

vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => panelMock(),
}));

vi.mock("@/shared/lib/formatDisplayDateTime", () => ({
    useFormatDisplayDateTime: () => (value: string) => `quando:${value}`,
}));

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useListAccountSessions",
    () => ({ useListAccountSessions: () => listMock() })
);

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useAccountSessionMutations",
    () => ({
        useAccountSessionMutations: () => ({
            revokeSessionMutation: {
                mutate: revokeMutateMock,
                isPending: mutationState.pending,
                variables: undefined,
            },
            revokeOtherSessionsMutation: {
                mutate: revokeOthersMutateMock,
                isPending: false,
            },
        }),
    })
);

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));

const { AccountSessionsPanel } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSessionsPanel"
);
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);

const sessionsCopy =
    globalTranslations["pt-br"].apps.app.pages.common.account.security.sessions;

const CURRENT = {
    id: "1790800000",
    current: true,
    browser: "Chrome",
    os: "macOS",
    deviceType: "desktop",
    signedInAt: "2026-09-30T20:26:40.000Z",
    lastSeenAt: "2026-09-30T22:00:00.000Z",
};
const OTHER = {
    id: "1790500000",
    current: false,
    browser: "Safari",
    os: "iOS",
    deviceType: "mobile",
    signedInAt: "2026-09-27T09:06:40.000Z",
    lastSeenAt: "2026-09-29T11:45:00.000Z",
};
const UNKNOWN = {
    ...OTHER,
    id: "1790400000",
    browser: null,
    os: null,
    deviceType: null,
};

function givenSessions(data: unknown[], error: unknown = null) {
    listMock.mockReturnValue({
        data,
        isLoading: false,
        isFetching: false,
        error,
        refetch: vi.fn(),
    });
}

const ROW_REVOKE_LABEL = /^Encerrar a sessão em/;

function revokeButtons() {
    return screen.queryAllByRole("button", { name: ROW_REVOKE_LABEL });
}

function revokeOthersTrigger() {
    return screen.getByRole("button", {
        name: sessionsCopy.revokeOthers,
    }) as HTMLButtonElement;
}

beforeEach(() => {
    vi.clearAllMocks();
    mutationState.pending = false;
    panelMock.mockReturnValue({ isImpersonating: false });
    givenSessions([CURRENT, OTHER]);
});

afterEach(cleanup);

describe("AccountSessionsPanel", () => {
    it("marca a sessão atual e não oferece encerrá-la", () => {
        render(<AccountSessionsPanel />);

        expect(screen.getByText(sessionsCopy.current)).toBeTruthy();
        expect(revokeButtons()).toHaveLength(1);
        expect(
            screen.getByRole("button", {
                name: sessionsCopy.revokeAriaLabel.replace(
                    "{device}",
                    "Safari · iOS"
                ),
            })
        ).toBeTruthy();
        expect(screen.getByText(sessionsCopy.deviceTypes.mobile)).toBeTruthy();
    });

    it("encerra a sessão da linha", () => {
        render(<AccountSessionsPanel />);

        fireEvent.click(revokeButtons()[0] as HTMLElement);

        expect(revokeMutateMock).toHaveBeenCalledWith(OTHER.id);
    });

    it("mostra 'Dispositivo desconhecido' para um navegador não reconhecido", () => {
        givenSessions([CURRENT, UNKNOWN]);
        render(<AccountSessionsPanel />);

        expect(screen.getByText(sessionsCopy.unknownDevice)).toBeTruthy();
    });

    it("só encerra as outras depois da confirmação no diálogo", () => {
        render(<AccountSessionsPanel />);

        fireEvent.click(revokeOthersTrigger());
        expect(revokeOthersMutateMock).not.toHaveBeenCalled();

        fireEvent.click(
            screen.getByRole("button", {
                name: sessionsCopy.revokeOthersAction,
            })
        );

        expect(revokeOthersMutateMock).toHaveBeenCalledTimes(1);
    });

    it("desabilita 'encerrar as outras' quando só existe a atual", () => {
        givenSessions([CURRENT]);
        render(<AccountSessionsPanel />);

        expect(revokeOthersTrigger().disabled).toBe(true);
    });

    it("desabilita as ações durante uma personificação", () => {
        panelMock.mockReturnValue({ isImpersonating: true });
        givenSessions([{ ...CURRENT, current: false }, OTHER]);
        render(<AccountSessionsPanel />);

        expect(screen.queryByText(sessionsCopy.current)).toBeNull();
        for (const button of revokeButtons()) {
            expect((button as HTMLButtonElement).disabled).toBe(true);
        }
        expect(revokeOthersTrigger().disabled).toBe(true);
    });

    it("desabilita os botões enquanto um encerramento está em curso", () => {
        mutationState.pending = true;
        render(<AccountSessionsPanel />);

        for (const button of revokeButtons()) {
            expect((button as HTMLButtonElement).disabled).toBe(true);
        }
        expect(revokeOthersTrigger().disabled).toBe(true);
    });

    it("mostra o erro de carga traduzido no lugar da lista", () => {
        const headers = new AxiosHeaders();
        const config = { headers };
        givenSessions(
            [],
            new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
                status: 401,
                statusText: "Unauthorized",
                headers,
                config,
                data: { error: { code: "AUTH_INVALID_TOKEN" } },
            } as never)
        );
        render(<AccountSessionsPanel />);

        expect(
            screen.getByText(
                globalTranslations["pt-br"].packages.utils.apiErrors
                    .AUTH_INVALID_TOKEN
            )
        ).toBeTruthy();
        expect(screen.queryByText(sessionsCopy.empty)).toBeNull();
        expect(revokeButtons()).toHaveLength(0);
    });
});
