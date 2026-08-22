import { EntityType } from "@repo/sdk/src/types";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { panelMock, listEntitiesMock, deleteMutateMock, toggleMutateMock } =
    vi.hoisted(() => ({
        panelMock: vi.fn(),
        listEntitiesMock: vi.fn(),
        deleteMutateMock: vi.fn(),
        toggleMutateMock: vi.fn(),
    }));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));
vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => panelMock(),
}));
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(hooks)/useListEntities",
    () => ({ useListEntities: () => listEntitiesMock() })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(hooks)/useEntityCrud",
    () => ({
        useEntityCrud: () => ({
            deleteEntityMutation: { mutate: deleteMutateMock },
            toggleEntityStatusMutation: {
                mutate: toggleMutateMock,
                isPending: false,
                variables: undefined,
            },
        }),
    })
);

/**
 * Stand-ins for the antd-backed primitives: `Table` runs the column renderers so the real
 * `Switch` and the real handlers are exercised, and `ActionsMenu` mirrors the contract of
 * the shared component — an item only exists when its handler was provided.
 */
vi.mock("@repo/design-system/components/ui", () => ({
    AddButton: ({
        disabled,
        onClick,
    }: {
        disabled?: boolean;
        onClick?: () => void;
    }) => (
        <button
            data-testid="add-entity"
            disabled={disabled}
            onClick={onClick}
            type="button"
        >
            add
        </button>
    ),
    ActionsMenu: ({
        onEdit,
        onDelete,
    }: {
        onEdit?: () => void;
        onDelete?: () => void;
    }) => (
        <div>
            {onEdit ? (
                <button
                    data-testid="edit-entity"
                    onClick={onEdit}
                    type="button"
                >
                    edit
                </button>
            ) : null}
            {onDelete ? (
                <button
                    data-testid="delete-entity"
                    onClick={onDelete}
                    type="button"
                >
                    delete
                </button>
            ) : null}
        </div>
    ),
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
        <div data-testid="table">
            {dataSource.map((row, rowIndex) => (
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
}));

const { EntitiesListClient } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/(home)/EntitiesListClient"
);

const ENTITY = {
    id: "entity-1",
    name: "Acme",
    description: "A customer",
    type: EntityType.CUSTOMER,
    photo: null,
    genre: null,
    birthdate: null,
    enabled: true,
    userId: "common-9",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
};

function givenPanel(panel: {
    isImpersonating: boolean;
    impersonatedLabel?: string | null;
    impersonatedFirebaseUid?: string | null;
}) {
    panelMock.mockReturnValue({
        impersonatedFirebaseUid: null,
        impersonatedLabel: null,
        ...panel,
    });
}

function isDisabled(element: HTMLElement | null) {
    return element?.hasAttribute("disabled") ?? false;
}

function firstSwitch() {
    return document.querySelector<HTMLElement>('[role="switch"]');
}

beforeEach(() => {
    // Vitest runs without globals here, so RTL never auto-unmounts between cases.
    cleanup();
    panelMock.mockReset();
    listEntitiesMock.mockReset();
    deleteMutateMock.mockReset();
    toggleMutateMock.mockReset();
    listEntitiesMock.mockReturnValue({
        data: [ENTITY],
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
    });
});

describe("EntitiesListClient while acting as another user", () => {
    it("suppresses every mutating affordance and explains why", () => {
        givenPanel({
            isImpersonating: true,
            impersonatedFirebaseUid: "target-1234567890",
            impersonatedLabel: "Alice",
        });

        render(<EntitiesListClient />);

        expect(isDisabled(screen.getByTestId("add-entity"))).toBe(true);
        expect(isDisabled(firstSwitch())).toBe(true);
        expect(screen.queryByTestId("delete-entity")).toBeNull();
        // Reading a record is still the point of the mode.
        expect(screen.getByTestId("edit-entity")).toBeTruthy();
        expect(screen.getByRole("alert").textContent).toContain("Alice");
    });

    it("falls back to the truncated uid before the display name hydrates", () => {
        givenPanel({
            isImpersonating: true,
            impersonatedFirebaseUid: "target-1234567890",
            impersonatedLabel: null,
        });

        render(<EntitiesListClient />);

        const notice = screen.getByRole("alert");
        expect(notice.textContent).toContain("target-1");
        expect(notice.textContent).not.toContain("null");
    });

    it("leaves a common user's own list untouched", () => {
        givenPanel({ isImpersonating: false });

        render(<EntitiesListClient />);

        expect(isDisabled(screen.getByTestId("add-entity"))).toBe(false);
        expect(isDisabled(firstSwitch())).toBe(false);
        expect(screen.getByTestId("delete-entity")).toBeTruthy();
        expect(screen.getByTestId("edit-entity")).toBeTruthy();
        expect(screen.queryByRole("alert")).toBeNull();
    });
});
