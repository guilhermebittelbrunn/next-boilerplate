import type { Stripe } from "@repo/payments";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listMock, autoPagingToArrayMock } = vi.hoisted(() => ({
    listMock: vi.fn(),
    autoPagingToArrayMock: vi.fn(),
}));

vi.mock("@repo/payments", () => ({
    isPaymentsConfigured: () => true,
}));

vi.mock("@/env", () => ({ env: {} }));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {},
}));

const { listActiveEntitlementKeys } = await import("@/(shared)/lib/billing");

const CUSTOMER_ID = "cus_qa";
const PAGE_SIZE = 100;
const MAX_ENTITLEMENTS = 1000;

const stripe = {
    entitlements: { activeEntitlements: { list: listMock } },
} as unknown as Stripe;

function activeEntitlement(lookupKey: string) {
    return {
        id: `ent_${lookupKey}`,
        object: "entitlements.active_entitlement",
        feature: `feat_${lookupKey}`,
        livemode: false,
        lookup_key: lookupKey,
    };
}

beforeEach(() => {
    listMock.mockReset();
    autoPagingToArrayMock.mockReset();
    listMock.mockReturnValue({ autoPagingToArray: autoPagingToArrayMock });
});

describe("listActiveEntitlementKeys", () => {
    it("pages the customer's active entitlements and returns their lookup keys", async () => {
        autoPagingToArrayMock.mockResolvedValue([
            activeEntitlement("advanced-reports"),
            activeEntitlement("feature-11"),
        ]);

        const keys = await listActiveEntitlementKeys(stripe, CUSTOMER_ID);

        expect(listMock).toHaveBeenCalledWith({
            customer: CUSTOMER_ID,
            limit: PAGE_SIZE,
        });
        expect(autoPagingToArrayMock).toHaveBeenCalledWith({
            limit: MAX_ENTITLEMENTS,
        });
        expect(keys).toEqual(["advanced-reports", "feature-11"]);
    });

    it("returns an empty list when the customer holds nothing", async () => {
        autoPagingToArrayMock.mockResolvedValue([]);

        await expect(
            listActiveEntitlementKeys(stripe, CUSTOMER_ID)
        ).resolves.toEqual([]);
    });

    it("lets a provider failure through, so the webhook answers 500 and the event is redelivered", async () => {
        const failure = new Error("stripe unavailable");
        autoPagingToArrayMock.mockRejectedValue(failure);

        await expect(
            listActiveEntitlementKeys(stripe, CUSTOMER_ID)
        ).rejects.toBe(failure);
    });
});
