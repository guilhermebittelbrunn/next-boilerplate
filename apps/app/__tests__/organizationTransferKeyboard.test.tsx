import { globalTranslations } from "@repo/internationalization/translations/global";
import type { OrganizationMemberDTO } from "@repo/sdk/src/types";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { transferMutateMock } = vi.hoisted(() => ({
    transferMutateMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));
vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => ({
        isImpersonating: false,
        impersonatedLabel: null,
        impersonatedFirebaseUid: null,
    }),
}));
vi.mock("@/shared/lib/formatDisplayDateTime", () => ({
    useFormatDisplayDateTime: () => (value: string) => value,
}));

const OWNER: OrganizationMemberDTO = {
    userId: "owner-profile",
    role: "owner",
    email: "owner@example.com",
    displayName: "Owner",
    joinedAt: "2026-10-01T00:00:00.000Z",
    archived: false,
};
const MEMBER_EMAIL = "qa-ownership-transfer@example.com";
const MEMBER: OrganizationMemberDTO = {
    userId: "member-profile",
    role: "member",
    email: MEMBER_EMAIL,
    displayName: "QA Member",
    joinedAt: "2026-10-02T00:00:00.000Z",
    archived: false,
};

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/organization/(hooks)/useListOrganizationMembers",
    () => ({
        useListOrganizationMembers: () => ({
            data: [OWNER, MEMBER],
            isLoading: false,
            isFetching: false,
            error: null,
            refetch: vi.fn(),
        }),
    })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/organization/(hooks)/useOrganizationActions",
    () => ({
        useOrganizationActions: () => ({
            removeMemberMutation: { mutate: vi.fn() },
            transferOwnershipMutation: {
                mutate: transferMutateMock,
                isPending: false,
            },
        }),
    })
);

/**
 * The real `ActionsMenu` (antd `Dropdown` + rc-menu) and the real Radix dialog: the defect
 * lives in how the two hand the same Enter press to each other. Only the antd `Table` is
 * replaced, by a renderer that runs each column per row.
 */
vi.mock("@repo/design-system/components/ui", async () => {
    const { ActionsMenu } = await vi.importActual<
        typeof import("@repo/design-system/components/ui/action-menu")
    >("@repo/design-system/components/ui/action-menu");
    return {
        ActionsMenu,
        Table: <TRow,>({
            columns,
            dataSource,
        }: {
            columns: {
                dataIndex: string;
                render?: (value: unknown, row: TRow) => ReactNode;
            }[];
            dataSource?: TRow[];
        }) => (
            <div>
                {dataSource?.map((row, rowIndex) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable fixture order
                    <div data-testid="table-row" key={rowIndex}>
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
    };
});

const { OrganizationMembersTable } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/organization/(components)/OrganizationMembersTable"
);

const organizationCopy =
    globalTranslations["pt-br"].apps.app.pages.common.organization;
const actionMenuCopy = globalTranslations["pt-br"].components.actionMenu;
const ENTER = { key: "Enter", code: "Enter", keyCode: 13, which: 13 };

/**
 * A browser's Enter: `keydown` goes to the focused element; unless a handler cancelled it,
 * `keypress` and the click of Enter's activation behaviour go to whatever holds focus once
 * the `keydown` handlers have run. Only buttons and links have that activation behaviour.
 */
function pressEnterLikeABrowser(target: Element) {
    const notCancelled = fireEvent.keyDown(target, ENTER);
    const focused = document.activeElement ?? document.body;
    if (notCancelled) {
        fireEvent.keyPress(focused, { ...ENTER, charCode: 13 });
        if (
            focused instanceof HTMLButtonElement ||
            focused instanceof HTMLAnchorElement
        ) {
            fireEvent.click(focused);
        }
    }
    fireEvent.keyUp(focused, ENTER);
}

async function focusTransferItem() {
    const memberRow = screen
        .getAllByTestId("table-row")
        .find((row) => row.textContent?.includes(MEMBER_EMAIL));
    const trigger = memberRow?.querySelector<HTMLButtonElement>(
        `button[aria-label="${actionMenuCopy.trigger}"]`
    );
    if (!trigger) {
        throw new Error("no actions trigger on the member row");
    }
    trigger.focus();
    fireEvent.click(trigger);

    const label = await screen.findByText(organizationCopy.transfer.action);
    const item = label.closest('[role="menuitem"]');
    if (!item) {
        throw new Error("no transfer menu item");
    }
    await waitFor(() =>
        expect(
            item.closest('[role="menu"]')?.contains(document.activeElement)
        ).toBe(true)
    );
    return item;
}

beforeEach(() => {
    transferMutateMock.mockReset();
});

afterEach(cleanup);

describe("ownership transfer from the keyboard", () => {
    it("keeps the dialog open with focus on cancel after Enter on the menu item", async () => {
        render(<OrganizationMembersTable isOwner />);

        const item = await focusTransferItem();
        await act(async () => {
            pressEnterLikeABrowser(item);
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        const dialog = await screen.findByRole("alertdialog");
        const cancel = screen.getByRole("button", {
            name: organizationCopy.transfer.cancel,
        });
        await waitFor(() => expect(document.activeElement).toBe(cancel));
        expect(dialog.isConnected).toBe(true);
        expect(screen.queryByRole("alertdialog")).not.toBeNull();
        expect(transferMutateMock).not.toHaveBeenCalled();
    });

    it("transfers once when Enter then confirms from the keyboard", async () => {
        render(<OrganizationMembersTable isOwner />);

        const item = await focusTransferItem();
        await act(async () => {
            pressEnterLikeABrowser(item);
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        const confirm = await screen.findByRole("button", {
            name: organizationCopy.transfer.confirm,
        });
        confirm.focus();
        await act(async () => {
            pressEnterLikeABrowser(confirm);
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(transferMutateMock).toHaveBeenCalledTimes(1);
        expect(transferMutateMock).toHaveBeenCalledWith(MEMBER);
    });
});
