import { globalTranslations } from "@repo/internationalization/translations/global";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { envMock, useMyAccountMock } = vi.hoisted(() => ({
    envMock: {
        NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE: undefined as string | undefined,
    },
    useMyAccountMock: vi.fn(),
}));

vi.mock("@/env", () => ({ env: envMock }));
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));
vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => ({
        isImpersonating: false,
        impersonatedFirebaseUid: null,
        impersonatedLabel: null,
    }),
}));
vi.mock("@/shared/hooks/useMyAccount", () => ({
    useMyAccount: () => useMyAccountMock(),
}));
vi.mock("@/shared/hooks/useFileUpload", () => ({
    useFileUpload: () => ({ uploadFile: vi.fn(), isUploading: false }),
}));
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(hooks)/useEntityCrud",
    () => ({
        useEntityCrud: () => ({
            createEntityMutation: { mutate: vi.fn(), isPending: false },
        }),
    })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(components)/EntityFormFields",
    () => ({
        EntityFormFields: () => <div data-testid="entity-fields" />,
    })
);

const CreateEntityPage = (
    await import(
        "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page"
    )
).default;

const planGateCopy = globalTranslations["pt-br"].apps.app.shared.planGate;

beforeEach(() => {
    envMock.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = undefined;
    useMyAccountMock.mockReset();
    useMyAccountMock.mockReturnValue({
        data: {
            planAccess: { enforced: true, subscribed: false, features: [] },
        },
        isLoading: false,
        isError: false,
    });
});

afterEach(cleanup);

describe("CreateEntityPage — optional plan gate", () => {
    it("shows the form without consulting the plan when no feature is configured", () => {
        render(<CreateEntityPage />);

        expect(screen.getByTestId("entity-fields")).toBeTruthy();
        expect(useMyAccountMock).not.toHaveBeenCalled();
    });

    it("shows the subscribe invite instead of the form when access is denied", () => {
        envMock.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = "advanced-reports";

        render(<CreateEntityPage />);

        expect(
            screen.getByText(planGateCopy.subscriptionRequired.title)
        ).toBeTruthy();
        expect(screen.queryByTestId("entity-fields")).toBeNull();
        expect(document.querySelector('button[type="submit"]')).toBeNull();
    });

    it("shows the form to a subscriber holding the feature", () => {
        envMock.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = "advanced-reports";
        useMyAccountMock.mockReturnValue({
            data: {
                planAccess: {
                    enforced: true,
                    subscribed: true,
                    features: ["advanced-reports"],
                },
            },
            isLoading: false,
            isError: false,
        });

        render(<CreateEntityPage />);

        expect(screen.getByTestId("entity-fields")).toBeTruthy();
    });
});
