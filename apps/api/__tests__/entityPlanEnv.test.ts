// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const SERVICE_ACCOUNT = {
    FIREBASE_ADMIN_PROJECT_ID: "demo-project",
    FIREBASE_ADMIN_CLIENT_EMAIL: "svc@demo-project.iam.gserviceaccount.com",
    FIREBASE_ADMIN_PRIVATE_KEY:
        "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
};

const MANAGED_VARS = [
    ...Object.keys(SERVICE_ACCOUNT),
    "NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE",
] as const;

const originalEnv = { ...process.env };

function givenEnv(vars: Record<string, string>) {
    for (const name of MANAGED_VARS) {
        Reflect.deleteProperty(process.env, name);
    }
    Object.assign(process.env, SERVICE_ACCOUNT, vars);
}

beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    for (const name of MANAGED_VARS) {
        Reflect.deleteProperty(process.env, name);
    }
    Object.assign(process.env, originalEnv);
});

describe("NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE in the typed environment", () => {
    it("reads the empty value .env.example ships as no gate", async () => {
        givenEnv({ NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE: "" });

        const { entityPlanRequirement } = await import(
            "@/(shared)/lib/entity-plan"
        );

        expect(entityPlanRequirement()).toBeNull();
    });

    it("turns the empty value into an absent one before validation", async () => {
        givenEnv({ NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE: "" });

        const { env } = await import("@/env");

        expect(env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE).toBeUndefined();
    });

    it("asks for the configured lookup key", async () => {
        givenEnv({ NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE: "advanced-reports" });

        const { entityPlanRequirement } = await import(
            "@/(shared)/lib/entity-plan"
        );

        expect(entityPlanRequirement()).toEqual({
            feature: "advanced-reports",
        });
    });
});
