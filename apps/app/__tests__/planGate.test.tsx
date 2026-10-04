import { globalTranslations } from "@repo/internationalization/translations/global";
import type { PlanAccessDTO } from "@repo/sdk/src/types";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useMyAccountMock } = vi.hoisted(() => ({
    useMyAccountMock: vi.fn(),
}));

vi.mock("@/shared/hooks/useMyAccount", () => ({
    useMyAccount: (...args: unknown[]) => useMyAccountMock(...args),
}));

const { PlanGate } = await import("@/shared/components/ui/PlanGate");

const planGateCopy = globalTranslations["pt-br"].apps.app.shared.planGate;
const FEATURE = "advanced-reports";

function givenAccess(planAccess: PlanAccessDTO | undefined) {
    useMyAccountMock.mockReturnValue({
        data: { planAccess },
        isLoading: false,
        isError: false,
    });
}

function renderGate(requirement: { feature?: string } = { feature: FEATURE }) {
    return render(
        <PlanGate loadingFallback={<p>carregando</p>} requirement={requirement}>
            <p>conteúdo protegido</p>
        </PlanGate>
    );
}

function inviteLink() {
    return screen.getByRole("link", { name: planGateCopy.viewPlans });
}

beforeEach(() => {
    useMyAccountMock.mockReset();
});

afterEach(cleanup);

describe("PlanGate", () => {
    it("shows the content while billing is off, even without a subscription", () => {
        givenAccess({ enforced: false, subscribed: false, features: [] });

        renderGate();

        expect(screen.getByText("conteúdo protegido")).toBeTruthy();
        expect(screen.queryByRole("link")).toBeNull();
    });

    it("shows the fallback while the account loads", () => {
        useMyAccountMock.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
        });

        renderGate();

        expect(screen.getByText("carregando")).toBeTruthy();
        expect(screen.queryByText("conteúdo protegido")).toBeNull();
    });

    it("shows the fallback while the query waits for the token or renders on the server", () => {
        useMyAccountMock.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: false,
        });

        renderGate();

        expect(screen.getByText("carregando")).toBeTruthy();
        expect(screen.queryByText("conteúdo protegido")).toBeNull();
        expect(screen.queryByRole("link")).toBeNull();
    });

    it("asks for a fresh account on every mount", () => {
        givenAccess({ enforced: true, subscribed: true, features: [FEATURE] });

        renderGate();

        expect(useMyAccountMock).toHaveBeenCalledWith({
            refetchOnMount: "always",
        });
    });

    it("invites to subscribe, linking to the billing tab, without a live subscription", () => {
        givenAccess({ enforced: true, subscribed: false, features: [] });

        renderGate();

        expect(
            screen.getByText(planGateCopy.subscriptionRequired.title)
        ).toBeTruthy();
        expect(
            screen.getByText(planGateCopy.subscriptionRequired.description)
        ).toBeTruthy();
        expect(inviteLink().getAttribute("href")).toBe(
            "/pt-br/account?tab=billing"
        );
        expect(screen.queryByText("conteúdo protegido")).toBeNull();
    });

    it("explains the plan lacks the feature for a subscriber without it", () => {
        givenAccess({ enforced: true, subscribed: true, features: ["other"] });

        renderGate();

        expect(
            screen.getByText(planGateCopy.featureRequired.title)
        ).toBeTruthy();
        expect(inviteLink().getAttribute("href")).toBe(
            "/pt-br/account?tab=billing"
        );
        expect(screen.queryByText("conteúdo protegido")).toBeNull();
    });

    it("shows the content to a subscriber holding the feature", () => {
        givenAccess({ enforced: true, subscribed: true, features: [FEATURE] });

        renderGate();

        expect(screen.getByText("conteúdo protegido")).toBeTruthy();
    });

    it("asks only for a subscription when the requirement names no feature", () => {
        givenAccess({ enforced: true, subscribed: true, features: [] });

        renderGate({});

        expect(screen.getByText("conteúdo protegido")).toBeTruthy();
    });

    it("leaves the decision to the API when the account fails to load", () => {
        useMyAccountMock.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
        });

        renderGate();

        expect(screen.getByText("conteúdo protegido")).toBeTruthy();
    });

    it("leaves the decision to the API when the account carries no plan access", () => {
        givenAccess(undefined);

        renderGate();

        expect(screen.getByText("conteúdo protegido")).toBeTruthy();
    });
});
