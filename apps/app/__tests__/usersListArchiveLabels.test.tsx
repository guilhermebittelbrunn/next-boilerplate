import { UserType } from "@repo/sdk/src/types";
import { setCookie } from "@repo/shared/utils/helpers/cookies";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listUsersMock, actionsMenuSpy } = vi.hoisted(() => ({
    listUsersMock: vi.fn(),
    actionsMenuSpy: vi.fn(),
}));

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

function user() {
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
    };
}

function givenUsers() {
    listUsersMock.mockReturnValue({
        data: [user()],
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
