import { UserType } from "@repo/sdk/src/types";
import { setCookie } from "@repo/shared/utils/helpers/cookies";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listUsersMock, actionsMenuSpy, authMock } = vi.hoisted(() => ({
    listUsersMock: vi.fn(),
    actionsMenuSpy: vi.fn(),
    authMock: vi.fn(),
}));

vi.mock("@repo/auth/provider", () => ({ default: () => authMock() }));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));

vi.mock("@/shared/hooks/useListUsers", () => ({
    useListUsers: () => listUsersMock(),
}));

vi.mock(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(hooks)/useUserCrud",
    () => ({
        useUserCrud: () => ({
            deleteUserMutation: { mutate: vi.fn() },
            toggleUserStatusMutation: {
                mutate: vi.fn(),
                isPending: false,
                variables: undefined,
            },
        }),
    })
);

vi.mock("@repo/design-system/components/ui", () => ({
    AddButton: () => <button type="button">add</button>,
    ActionsMenu: (props: Record<string, unknown>) => {
        actionsMenuSpy(props);
        return <div />;
    },
    Table: <TRow,>({
        columns,
        dataSource,
    }: {
        columns: {
            title: string;
            dataIndex: string;
            render?: (value: unknown, row: TRow) => ReactNode;
        }[];
        dataSource: TRow[];
    }) => (
        <div data-testid="table">
            <div data-testid="head">
                {columns.map((column) => (
                    <span key={column.dataIndex}>{column.title}</span>
                ))}
            </div>
            {dataSource.map((row, rowIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: stable fixture order
                <div data-testid="table-row" key={rowIndex}>
                    {columns.map((column) => (
                        <div
                            data-testid={`cell-${column.dataIndex}`}
                            key={column.dataIndex}
                        >
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

function user(overrides: Record<string, unknown> = {}) {
    return {
        id: "p1",
        type: UserType.COMMON,
        reference_id: "uid-1",
        createdAt: "2026-08-02T12:00:00.000Z",
        updatedAt: "2026-08-02T12:00:00.000Z",
        deletedAt: null,
        uid: "uid-1",
        email: "user@example.com",
        emailVerified: true,
        displayName: "Ana",
        photoURL: null,
        phoneNumber: null,
        disabled: false,
        metadata: {
            creationTime: "Sat, 02 Aug 2026 12:00:00 GMT",
            lastSignInTime: "Tue, 15 Sep 2026 09:12:00 GMT",
            lastRefreshTime: null,
        },
        providerData: [],
        customClaims: null,
        ...overrides,
    };
}

function givenUsers(rows = [user()]) {
    listUsersMock.mockReturnValue({
        data: rows,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
    });
}

function givenLocale(locale: string) {
    const ONE_HOUR_IN_SECONDS = 3600;
    setCookie("x-locale", locale, ONE_HOUR_IN_SECONDS);
}

function deleteLabels() {
    const lastCall = actionsMenuSpy.mock.calls.at(-1)?.[0] as
        | { deleteLabels?: Record<string, string> }
        | undefined;

    return lastCall?.deleteLabels;
}

beforeEach(() => {
    cleanup();
    listUsersMock.mockReset();
    actionsMenuSpy.mockReset();
    authMock.mockReset();
    authMock.mockReturnValue({ user: null });
    givenLocale("pt-br");
});

/**
 * The row already carries a switch that flips the Firebase Auth `disabled` flag, shown as
 * "Ativo"/"Desativado". The menu action is a different operation — it stamps `deletedAt`,
 * which hides the record and keeps the email taken — so it must not borrow that word.
 */
describe("archive labels on the admin users list", () => {
    it.each([
        ["pt-br", "Arquivar", "Arquivar usuário"],
        ["en", "Archive", "Archive user"],
        ["es", "Archivar", "Archivar usuario"],
    ])("names the row action in %s", (locale, action, confirmTitle) => {
        givenLocale(locale);
        givenUsers();

        render(<UsersListClient />);

        expect(deleteLabels()?.action).toBe(action);
        expect(deleteLabels()?.confirmTitle).toBe(confirmTitle);
    });

    it("never reuses the disabled-status wording for the row action", () => {
        givenUsers();

        render(<UsersListClient />);

        const labels = deleteLabels();
        expect(labels?.action).toBeDefined();
        expect(labels?.action?.toLowerCase()).not.toContain("desativ");
        expect(labels?.confirmTitle?.toLowerCase()).not.toContain("desativ");
    });

    it("says the record survives, so archiving is not read as erasure", () => {
        givenUsers();

        render(<UsersListClient />);

        expect(deleteLabels()?.confirmDescription).toContain("preservado");
    });
});

describe("status switch on the admin users list", () => {
    it("names the switch after the user it toggles", () => {
        givenUsers();

        render(<UsersListClient />);

        expect(
            screen.getByRole("switch", { name: "Usuário ativo: Ana" })
        ).toBeTruthy();
    });

    it("falls back to the email when the user has no display name", () => {
        givenUsers([user({ displayName: null })]);

        render(<UsersListClient />);

        expect(
            screen.getByRole("switch", {
                name: "Usuário ativo: user@example.com",
            })
        ).toBeTruthy();
    });
});

describe("the signed-in admin's own row", () => {
    const OWN_UID = "admin-uid";
    const ROW_COUNT = 2;

    function givenOwnAndOtherRows() {
        givenUsers([
            user({
                id: "p-own",
                uid: OWN_UID,
                reference_id: OWN_UID,
                type: UserType.ADMIN,
                displayName: "Own",
            }),
            user({
                id: "p-other-admin",
                uid: "other-admin-uid",
                reference_id: "other-admin-uid",
                type: UserType.ADMIN,
                displayName: "Other",
            }),
        ]);
    }

    function statusSwitchOfRow(rowIndex: number) {
        const statusCell = screen.getAllByTestId("cell-disabled")[rowIndex];
        return within(statusCell as HTMLElement).getByRole("switch");
    }

    function actionsMenuPropsOfRow(rowIndex: number) {
        const lastRender = actionsMenuSpy.mock.calls.slice(-ROW_COUNT);
        return lastRender[rowIndex]?.[0] as { onDelete?: unknown } | undefined;
    }

    it.each([
        ["pt-br", "Você não pode desativar a sua própria conta."],
        ["en", "You can't disable your own account."],
        ["es", "No puedes desactivar tu propia cuenta."],
    ])("disables the status switch and explains why in %s", (locale, hint) => {
        givenLocale(locale);
        authMock.mockReturnValue({ user: { uid: OWN_UID } });
        givenOwnAndOtherRows();

        render(<UsersListClient />);

        const ownSwitch = statusSwitchOfRow(0);
        expect(ownSwitch).toHaveProperty("disabled", true);
        expect(ownSwitch.getAttribute("title")).toBe(hint);
    });

    it("offers no archive action on the own row", () => {
        authMock.mockReturnValue({ user: { uid: OWN_UID } });
        givenOwnAndOtherRows();

        render(<UsersListClient />);

        expect(actionsMenuPropsOfRow(0)?.onDelete).toBeUndefined();
    });

    it("keeps both controls on other rows, other admins included", () => {
        authMock.mockReturnValue({ user: { uid: OWN_UID } });
        givenOwnAndOtherRows();

        render(<UsersListClient />);

        const otherSwitch = statusSwitchOfRow(1);
        expect(otherSwitch).toHaveProperty("disabled", false);
        expect(otherSwitch.getAttribute("title")).toBeNull();
        expect(actionsMenuPropsOfRow(1)?.onDelete).toBeTypeOf("function");
    });

    it("treats no row as own while the signed-in user is unknown", () => {
        givenOwnAndOtherRows();

        render(<UsersListClient />);

        for (const rowIndex of [0, 1]) {
            expect(statusSwitchOfRow(rowIndex)).toHaveProperty(
                "disabled",
                false
            );
        }
        expect(actionsMenuPropsOfRow(0)?.onDelete).toBeTypeOf("function");
        expect(actionsMenuPropsOfRow(1)?.onDelete).toBeTypeOf("function");
    });
});
