import {
    type PlanAccessDTO,
    type PlanRequirement,
    planAccessDenial,
} from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { isBillingEnabledMock } = vi.hoisted(() => ({
    isBillingEnabledMock: vi.fn(),
}));

vi.mock("@/(shared)/lib/billing", () => ({
    isBillingEnabled: () => isBillingEnabledMock(),
}));

const { readEntitlementFeatures, refusePlanAccess, toPlanAccess } =
    await import("@/(shared)/lib/plan-access");

const FEATURE = "advanced-reports";
const LIVE = { status: "active" };

function access(overrides: Partial<PlanAccessDTO> = {}): PlanAccessDTO {
    return { enforced: true, subscribed: true, features: [], ...overrides };
}

beforeEach(() => {
    isBillingEnabledMock.mockReset();
    isBillingEnabledMock.mockReturnValue(true);
});

describe("planAccessDenial", () => {
    it.each<{
        name: string;
        access: PlanAccessDTO;
        requirement: PlanRequirement;
        expected: string | null;
    }>([
        {
            name: "billing off lets anyone through, even without a subscription",
            access: access({ enforced: false, subscribed: false }),
            requirement: { feature: FEATURE },
            expected: null,
        },
        {
            name: "no live subscription is refused for a status-only requirement",
            access: access({ subscribed: false }),
            requirement: {},
            expected: "PLAN_SUBSCRIPTION_REQUIRED",
        },
        {
            name: "no live subscription is refused as such even when it holds the feature",
            access: access({ subscribed: false, features: [FEATURE] }),
            requirement: { feature: FEATURE },
            expected: "PLAN_SUBSCRIPTION_REQUIRED",
        },
        {
            name: "a live subscription passes a status-only requirement",
            access: access(),
            requirement: {},
            expected: null,
        },
        {
            name: "a live subscription without the feature is refused",
            access: access({ features: ["something-else"] }),
            requirement: { feature: FEATURE },
            expected: "PLAN_FEATURE_REQUIRED",
        },
        {
            name: "a live subscription with the feature passes",
            access: access({ features: [FEATURE] }),
            requirement: { feature: FEATURE },
            expected: null,
        },
    ])("$name", ({ access: given, requirement, expected }) => {
        expect(planAccessDenial(given, requirement)).toBe(expected);
    });
});

describe("readEntitlementFeatures", () => {
    it.each([
        ["absent", undefined],
        ["null", null],
        ["a string", "advanced-reports"],
        ["a map without the list", { lastEventAt: "2026-01-01" }],
        ["a list that is not an array", { features: "advanced-reports" }],
    ])("reads %s as no features", (_label, stored) => {
        expect(readEntitlementFeatures(stored)).toEqual([]);
    });

    it("keeps only the string keys of a malformed list", () => {
        expect(
            readEntitlementFeatures({
                features: [FEATURE, Number.NaN, null, "x"],
            })
        ).toEqual([FEATURE, "x"]);
    });
});

describe("toPlanAccess", () => {
    it("reports enforced from the billing switch", () => {
        isBillingEnabledMock.mockReturnValue(false);

        expect(toPlanAccess({ subscription: LIVE })).toEqual({
            enforced: false,
            subscribed: true,
            features: [],
        });
    });

    it.each(["active", "trialing", "past_due", "unpaid", "paused"])(
        "counts %s as subscribed",
        (status) => {
            expect(toPlanAccess({ subscription: { status } }).subscribed).toBe(
                true
            );
        }
    );

    it.each(["canceled", "incomplete", "incomplete_expired", undefined])(
        "counts %s as not subscribed",
        (status) => {
            expect(toPlanAccess({ subscription: { status } }).subscribed).toBe(
                false
            );
        }
    );

    it("reads a profile with neither field as no subscription and no features", () => {
        expect(toPlanAccess({})).toEqual({
            enforced: true,
            subscribed: false,
            features: [],
        });
    });

    it("carries the stored features", () => {
        expect(
            toPlanAccess({
                subscription: LIVE,
                entitlements: {
                    features: [FEATURE],
                    lastEventAt: "2026-01-01T00:00:00.000Z",
                },
            }).features
        ).toEqual([FEATURE]);
    });
});

describe("refusePlanAccess", () => {
    async function codeOf(response: Response | null) {
        const body = (await response?.json()) as { error: { code: string } };
        return body.error.code;
    }

    it("answers 403 PLAN_SUBSCRIPTION_REQUIRED without a live subscription", async () => {
        const refusal = refusePlanAccess({}, {});

        expect(refusal?.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(refusal)).toBe("PLAN_SUBSCRIPTION_REQUIRED");
    });

    it("answers 403 PLAN_FEATURE_REQUIRED without the feature", async () => {
        const refusal = refusePlanAccess(
            { subscription: LIVE },
            { feature: FEATURE }
        );

        expect(refusal?.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(refusal)).toBe("PLAN_FEATURE_REQUIRED");
    });

    it("returns null when access is granted", () => {
        expect(
            refusePlanAccess(
                { subscription: LIVE, entitlements: { features: [FEATURE] } },
                { feature: FEATURE }
            )
        ).toBeNull();
    });

    it("returns null for anyone while billing is off", () => {
        isBillingEnabledMock.mockReturnValue(false);

        expect(refusePlanAccess({}, { feature: FEATURE })).toBeNull();
    });
});
