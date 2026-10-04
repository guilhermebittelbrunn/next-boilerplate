import { beforeEach, describe, expect, it, vi } from "vitest";

const { envMock } = vi.hoisted(() => ({
    envMock: {
        NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE: undefined as string | undefined,
    },
}));

vi.mock("@/env", () => ({ env: envMock }));

const { entityPlanRequirement } = await import(
    "@/shared/lib/entityPlanRequirement"
);

beforeEach(() => {
    envMock.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = undefined;
});

describe("entityPlanRequirement", () => {
    it("is null when the variable is absent", () => {
        expect(entityPlanRequirement()).toBeNull();
    });

    it("treats an empty string as absent, which is how .env.example opts out", () => {
        envMock.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = "";

        expect(entityPlanRequirement()).toBeNull();
    });

    it("asks for the configured feature", () => {
        envMock.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = "advanced-reports";

        expect(entityPlanRequirement()).toEqual({
            feature: "advanced-reports",
        });
    });
});
