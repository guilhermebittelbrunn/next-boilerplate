import { UserType } from "@repo/sdk/src/types";
import { setCookie } from "@repo/shared/utils/helpers/cookies";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listUsersMock } = vi.hoisted(() => ({
    listUsersMock: vi.fn(),
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
    ActionsMenu: () => <div />,
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

const STAMPED_AT = "2026-09-17T14:45:00.000Z";
const PROVIDER_REFRESH = "Wed, 17 Sep 2026 12:30:00 GMT";

function user(overrides: Record<string, unknown>) {
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

function givenUsers(rows: Record<string, unknown>[]) {
    listUsersMock.mockReturnValue({
        data: rows,
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
    });
}

function lastAccessCell() {
    return screen.getByTestId("cell-lastAccessAt");
}

function givenLocale(locale: string) {
    const ONE_HOUR_IN_SECONDS = 3600;
    setCookie("x-locale", locale, ONE_HOUR_IN_SECONDS);
}

function formattedFor(bcp47: string, instant: string) {
    return new Intl.DateTimeFormat(bcp47, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(instant));
}

beforeEach(() => {
    cleanup();
    listUsersMock.mockReset();
    givenLocale("pt-br");
});

describe("last access column", () => {
    it("carries the translated header", () => {
        givenUsers([user({})]);

        render(<UsersListClient />);

        expect(screen.getByTestId("head").textContent).toContain(
            "Último acesso"
        );
    });

    it("shows the stamped instant formatted for the locale", () => {
        givenUsers([user({ lastAccessAt: STAMPED_AT })]);

        render(<UsersListClient />);

        const rendered = lastAccessCell().textContent ?? "";
        expect(rendered).not.toBe("");
        expect(rendered).not.toContain(STAMPED_AT);
        expect(rendered).not.toContain("Invalid Date");
        expect(rendered).toBe(
            new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "medium",
                timeStyle: "short",
            }).format(new Date(STAMPED_AT))
        );
    });

    /**
     * `normalizeFirestoreInstant` answers the Unix epoch for an absent value, so a cell
     * that formatted before checking would read "1 de jan. de 1970" instead of saying the
     * user never came in.
     */
    it("names the absence instead of falling back to the epoch", () => {
        givenUsers([user({})]);

        render(<UsersListClient />);

        const rendered = lastAccessCell().textContent ?? "";
        expect(rendered).toBe("Nunca acessou");
        expect(rendered).not.toContain("1970");
    });

    it("falls back to the provider instant, marked as approximate", () => {
        givenUsers([
            user({
                metadata: {
                    creationTime: "Sat, 02 Aug 2026 12:00:00 GMT",
                    lastSignInTime: "Tue, 15 Sep 2026 09:12:00 GMT",
                    lastRefreshTime: PROVIDER_REFRESH,
                },
            }),
        ]);

        render(<UsersListClient />);

        const cell = lastAccessCell();
        expect(cell.textContent).toBe(
            new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "medium",
                timeStyle: "short",
            }).format(new Date(PROVIDER_REFRESH))
        );

        const value = cell.querySelector("span");
        expect(value?.getAttribute("title")).toBe(
            "Valor aproximado, vindo do provedor de autenticação"
        );
        expect(value?.className).toContain("text-muted-foreground");
    });

    /**
     * The provider measures a token refresh, not product use, so the profile's own stamp
     * wins even when the provider's instant is the more recent of the two.
     */
    it("prefers the profile stamp over a newer provider instant", () => {
        givenUsers([
            user({
                lastAccessAt: "2026-09-10T08:00:00.000Z",
                metadata: {
                    creationTime: "Sat, 02 Aug 2026 12:00:00 GMT",
                    lastSignInTime: "Tue, 15 Sep 2026 09:12:00 GMT",
                    lastRefreshTime: "Wed, 17 Sep 2026 21:58:00 GMT",
                },
            }),
        ]);

        render(<UsersListClient />);

        const cell = lastAccessCell();
        expect(cell.textContent).toBe(
            new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "medium",
                timeStyle: "short",
            }).format(new Date("2026-09-10T08:00:00.000Z"))
        );
        expect(cell.querySelector("span")?.getAttribute("title")).toBeNull();
    });

    it("renders each of the three states on the same screen", () => {
        givenUsers([
            user({ id: "p1", lastAccessAt: STAMPED_AT }),
            user({
                id: "p2",
                metadata: {
                    creationTime: "Sat, 02 Aug 2026 12:00:00 GMT",
                    lastSignInTime: "Tue, 15 Sep 2026 09:12:00 GMT",
                    lastRefreshTime: PROVIDER_REFRESH,
                },
            }),
            user({ id: "p3" }),
        ]);

        render(<UsersListClient />);

        const cells = screen.getAllByTestId("cell-lastAccessAt");
        const THREE_ROWS = 3;
        expect(cells).toHaveLength(THREE_ROWS);
        expect(cells[2]?.textContent).toBe("Nunca acessou");
        expect(cells[0]?.textContent).not.toBe(cells[1]?.textContent);
    });
});

describe("last access column in each language", () => {
    it("uses the English header, absence text and date format", () => {
        givenLocale("en");
        givenUsers([user({ lastAccessAt: STAMPED_AT }), user({ id: "p2" })]);

        render(<UsersListClient />);

        expect(screen.getByTestId("head").textContent).toContain("Last access");

        const cells = screen.getAllByTestId("cell-lastAccessAt");
        expect(cells[0]?.textContent).toBe(formattedFor("en", STAMPED_AT));
        expect(cells[0]?.textContent).not.toBe(
            formattedFor("pt-BR", STAMPED_AT)
        );
        expect(cells[1]?.textContent).toBe("Never accessed");
    });

    it("uses the Spanish header, absence text and date format", () => {
        givenLocale("es");
        givenUsers([user({ lastAccessAt: STAMPED_AT }), user({ id: "p2" })]);

        render(<UsersListClient />);

        expect(screen.getByTestId("head").textContent).toContain(
            "Último acceso"
        );

        const cells = screen.getAllByTestId("cell-lastAccessAt");
        expect(cells[0]?.textContent).toBe(formattedFor("es", STAMPED_AT));
        expect(cells[0]?.textContent).not.toBe(formattedFor("en", STAMPED_AT));
        expect(cells[1]?.textContent).toBe("Nunca accedió");
    });

    it("keeps the approximate warning translated in each language", () => {
        const withProviderInstant = user({
            metadata: {
                creationTime: "Sat, 02 Aug 2026 12:00:00 GMT",
                lastSignInTime: "Tue, 15 Sep 2026 09:12:00 GMT",
                lastRefreshTime: PROVIDER_REFRESH,
            },
        });

        givenLocale("en");
        givenUsers([withProviderInstant]);
        render(<UsersListClient />);
        expect(
            lastAccessCell().querySelector("span")?.getAttribute("title")
        ).toBe("Approximate value, from the authentication provider");

        cleanup();

        givenLocale("es");
        givenUsers([withProviderInstant]);
        render(<UsersListClient />);
        expect(
            lastAccessCell().querySelector("span")?.getAttribute("title")
        ).toBe("Valor aproximado, del proveedor de autenticación");
    });
});
