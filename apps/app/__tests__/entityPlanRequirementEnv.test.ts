import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalValue = process.env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE;

beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    if (originalValue === undefined) {
        Reflect.deleteProperty(
            process.env,
            "NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE"
        );
    } else {
        process.env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = originalValue;
    }
});

describe("NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE in the typed environment", () => {
    it("loads the empty value .env.example ships and reads it as no gate", async () => {
        process.env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = "";

        const { entityPlanRequirement } = await import(
            "@/shared/lib/entityPlanRequirement"
        );

        expect(entityPlanRequirement()).toBeNull();
    });

    it("turns the empty value into an absent one before validation", async () => {
        process.env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = "";

        const { env } = await import("@/env");

        expect(env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE).toBeUndefined();
    });

    it("asks for the configured lookup key", async () => {
        process.env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = "advanced-reports";

        const { entityPlanRequirement } = await import(
            "@/shared/lib/entityPlanRequirement"
        );

        expect(entityPlanRequirement()).toEqual({
            feature: "advanced-reports",
        });
    });
});
