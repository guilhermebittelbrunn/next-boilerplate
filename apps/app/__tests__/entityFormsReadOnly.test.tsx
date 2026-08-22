import { EntityType } from "@repo/sdk/src/types";
import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { panelMock, createMutateMock, updateMutateMock, findEntityMock } =
    vi.hoisted(() => ({
        panelMock: vi.fn(),
        createMutateMock: vi.fn(),
        updateMutateMock: vi.fn(),
        findEntityMock: vi.fn(),
    }));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useParams: () => ({ locale: "pt-br", id: "entity-1" }),
}));
vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => panelMock(),
}));
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(hooks)/useEntityCrud",
    () => ({
        useEntityCrud: () => ({
            createEntityMutation: {
                mutate: createMutateMock,
                isPending: false,
            },
            updateEntityMutation: {
                mutate: updateMutateMock,
                isPending: false,
            },
        }),
    })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(hooks)/useFindEntityById",
    () => ({ useFindEntityById: () => findEntityMock() })
);

/**
 * The real inputs drag in popovers and portals that only slow the cases down, so the stub
 * keeps just what is asserted: the value the form is currently holding.
 */
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(components)/EntityFormFields",
    async () => {
        const { useFormContext } = await import("react-hook-form");

        function EntityFormFields() {
            const { watch } = useFormContext();

            return <div data-testid="entity-fields">{watch("name")}</div>;
        }

        return { EntityFormFields };
    }
);

const CreateEntityPage = (
    await import(
        "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page"
    )
).default;
const { EditEntityClient } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/edit/[id]/EditEntityClient"
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

function givenPanel(isImpersonating: boolean) {
    panelMock.mockReturnValue({
        isImpersonating,
        impersonatedFirebaseUid: isImpersonating ? "target-1234567890" : null,
        impersonatedLabel: isImpersonating ? "Alice" : null,
    });
}

function submitButton() {
    return document.querySelector<HTMLButtonElement>('button[type="submit"]');
}

beforeEach(() => {
    cleanup();
    panelMock.mockReset();
    createMutateMock.mockReset();
    updateMutateMock.mockReset();
    findEntityMock.mockReset();
    findEntityMock.mockReturnValue({
        data: ENTITY,
        isLoading: false,
        isError: false,
    });
});

describe("CreateEntityPage", () => {
    it("blocks the submit and explains why while acting as another user", () => {
        givenPanel(true);

        render(<CreateEntityPage />);

        expect(submitButton()?.disabled).toBe(true);
        expect(screen.getByRole("alert").textContent).toContain("Alice");
    });

    it("leaves the submit available for the owner", () => {
        givenPanel(false);

        render(<CreateEntityPage />);

        expect(submitButton()?.disabled).toBe(false);
        expect(screen.queryByRole("alert")).toBeNull();
    });
});

describe("EditEntityClient", () => {
    it("blocks the submit and explains why while acting as another user", () => {
        givenPanel(true);

        render(<EditEntityClient />);

        expect(submitButton()?.disabled).toBe(true);
        expect(screen.getByRole("alert").textContent).toContain("Alice");
    });

    it("leaves the submit available for the owner", () => {
        givenPanel(false);

        render(<EditEntityClient />);

        expect(submitButton()?.disabled).toBe(false);
        expect(screen.queryByRole("alert")).toBeNull();
    });

    /**
     * Reading a record is the whole point of the mode, so the form still has to load the
     * impersonated user's data behind the blocked submit.
     */
    it("still loads the record while acting as another user", () => {
        givenPanel(true);

        render(<EditEntityClient />);

        expect(screen.getByTestId("entity-fields").textContent).toBe(
            ENTITY.name
        );
    });
});
