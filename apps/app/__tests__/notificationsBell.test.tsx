import { getDictionary } from "@repo/internationalization/client";
import { NOTIFICATION_UNREAD_COUNT_CAP } from "@repo/sdk/src/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    panelMock,
    unreadCountMock,
    listMock,
    markReadMutateMock,
    markAllMutateMock,
} = vi.hoisted(() => ({
    panelMock: vi.fn(),
    unreadCountMock: vi.fn(),
    listMock: vi.fn(),
    markReadMutateMock: vi.fn(),
    markAllMutateMock: vi.fn(),
}));

vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => panelMock(),
}));
vi.mock("@/shared/hooks/useUnreadNotificationsCount", () => ({
    useUnreadNotificationsCount: () => unreadCountMock(),
}));
vi.mock("@/shared/hooks/useListNotifications", () => ({
    useListNotifications: (options: { enabled: boolean }) => listMock(options),
}));
vi.mock("@/shared/hooks/useNotificationActions", () => ({
    useNotificationActions: () => ({
        markRead: { mutate: markReadMutateMock, isPending: false },
        markAllRead: { mutate: markAllMutateMock, isPending: false },
    }),
}));
vi.mock("@/shared/lib/formatDisplayDateTime", () => ({
    useFormatDisplayDateTime: () => (value: string) => value,
}));

const { default: NotificationsBell, formatUnreadBadge } = await import(
    "@/shared/components/notifications/NotificationsBell"
);

const BELL_NAME = /^Notifica/;
const BILLING_HREF = /\/account\?tab=billing$/;
const LAST_EXACT_COUNT = NOTIFICATION_UNREAD_COUNT_CAP - 1;

const notificationsCopy =
    getDictionary().dictionary.apps.app.shared.notifications;

function notification(id: string, overrides: Record<string, unknown> = {}) {
    return {
        id,
        userId: "p1",
        type: "subscriptionPaymentPending",
        params: {},
        readAt: null,
        expiresAt: null,
        createdAt: "2026-10-20T12:00:00.000Z",
        updatedAt: "2026-10-20T12:00:00.000Z",
        deletedAt: null,
        ...overrides,
    };
}

function givenList(items: ReturnType<typeof notification>[]) {
    listMock.mockReturnValue({
        data: items,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
    });
}

function openBell() {
    fireEvent.click(screen.getByRole("button", { name: BELL_NAME }));
}

beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    panelMock.mockReturnValue({ isImpersonating: false });
    unreadCountMock.mockReturnValue({ count: 0 });
    givenList([]);
});

describe("formatUnreadBadge", () => {
    it("mostra o número até 99 e 99+ a partir de 100", () => {
        expect(formatUnreadBadge(1)).toBe("1");
        expect(formatUnreadBadge(LAST_EXACT_COUNT)).toBe("99");
        expect(formatUnreadBadge(NOTIFICATION_UNREAD_COUNT_CAP)).toBe("99+");
    });
});

describe("NotificationsBell", () => {
    it("não mostra badge com zero não lidas e usa o rótulo sem contagem", () => {
        render(<NotificationsBell />);

        expect(screen.queryByTestId("notifications-badge")).toBeNull();
        expect(
            screen.getByRole("button", { name: notificationsCopy.triggerLabel })
        ).toBeTruthy();
    });

    it("mostra 99+ e diz a contagem no rótulo acessível", () => {
        unreadCountMock.mockReturnValue({
            count: NOTIFICATION_UNREAD_COUNT_CAP,
        });

        render(<NotificationsBell />);

        expect(screen.getByTestId("notifications-badge").textContent).toBe(
            "99+"
        );
        expect(
            screen.getByRole("button", {
                name: notificationsCopy.triggerLabelUnread.replace(
                    "{count}",
                    "99+"
                ),
            })
        ).toBeTruthy();
    });

    it("só pede a lista depois de abrir", () => {
        render(<NotificationsBell />);
        expect(listMock).not.toHaveBeenCalled();

        openBell();

        expect(listMock).toHaveBeenLastCalledWith({ enabled: true });
    });

    it("mostra o estado vazio", () => {
        render(<NotificationsBell />);
        openBell();

        expect(screen.getByText(notificationsCopy.emptyTitle)).toBeTruthy();
        expect(
            screen.getByText(notificationsCopy.emptyDescription)
        ).toBeTruthy();
    });

    it("lista o texto do dicionário e marca uma como lida", () => {
        unreadCountMock.mockReturnValue({ count: 1 });
        givenList([notification("n1")]);

        render(<NotificationsBell />);
        openBell();

        expect(
            screen.getByText(
                notificationsCopy.types.subscriptionPaymentPending.title
            )
        ).toBeTruthy();
        expect(screen.getByText(notificationsCopy.unread)).toBeTruthy();
        fireEvent.click(
            screen.getByRole("button", { name: notificationsCopy.markRead })
        );
        expect(markReadMutateMock).toHaveBeenCalledWith("n1");
    });

    it("desabilita os botões de marcar e explica por quê sob impersonação", () => {
        panelMock.mockReturnValue({ isImpersonating: true });
        unreadCountMock.mockReturnValue({ count: 1 });
        givenList([notification("n1")]);

        render(<NotificationsBell />);
        openBell();

        expect(screen.getByText(notificationsCopy.readOnlyHint)).toBeTruthy();
        expect(
            (
                screen.getByRole("button", {
                    name: notificationsCopy.markRead,
                }) as HTMLButtonElement
            ).disabled
        ).toBe(true);
        expect(
            (
                screen.getByRole("button", {
                    name: notificationsCopy.markAllRead,
                }) as HTMLButtonElement
            ).disabled
        ).toBe(true);
    });

    it("navega sem marcar como lida sob impersonação", () => {
        panelMock.mockReturnValue({ isImpersonating: true });
        givenList([notification("n1")]);

        render(<NotificationsBell />);
        openBell();
        const link = screen.getByRole("link", {
            name: notificationsCopy.types.subscriptionPaymentPending.title,
        });
        fireEvent.click(link);

        expect(link.getAttribute("href")).toMatch(BILLING_HREF);
        expect(markReadMutateMock).not.toHaveBeenCalled();
    });

    it("marca como lida ao seguir o destino fora da impersonação", () => {
        givenList([notification("n1")]);

        render(<NotificationsBell />);
        openBell();
        fireEvent.click(
            screen.getByRole("link", {
                name: notificationsCopy.types.subscriptionPaymentPending.title,
            })
        );

        expect(markReadMutateMock).toHaveBeenCalledWith("n1");
    });

    it("cai no texto genérico para um tipo desconhecido", () => {
        givenList([notification("n9", { type: "legacyTypeRemoved" })]);

        render(<NotificationsBell />);
        openBell();

        expect(screen.getByText(notificationsCopy.fallback.title)).toBeTruthy();
    });
});
