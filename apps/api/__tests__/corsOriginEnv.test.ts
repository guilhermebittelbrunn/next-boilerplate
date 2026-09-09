// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const SERVICE_ACCOUNT = {
    FIREBASE_ADMIN_PROJECT_ID: "demo-project",
    FIREBASE_ADMIN_CLIENT_EMAIL: "svc@demo-project.iam.gserviceaccount.com",
    FIREBASE_ADMIN_PRIVATE_KEY:
        "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
};

const MANAGED_VARS = [...Object.keys(SERVICE_ACCOUNT), "CORS_ORIGIN"] as const;

const originalEnv = { ...process.env };

function givenEnv(vars: Record<string, string>) {
    for (const name of MANAGED_VARS) {
        Reflect.deleteProperty(process.env, name);
    }
    Object.assign(process.env, vars);
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

describe("CORS_ORIGIN in the typed environment", () => {
    /**
     * The whole point of keeping it optional here: this module is validated eagerly
     * and route handlers import it, so a required variable would make every build
     * demand a production value.
     */
    it("loads without it, so no build starts demanding it", async () => {
        givenEnv(SERVICE_ACCOUNT);

        const { env } = await import("@/env");

        expect(env.CORS_ORIGIN).toBeUndefined();
    });

    it("exposes the raw list untouched when it is set", async () => {
        givenEnv({
            ...SERVICE_ACCOUNT,
            CORS_ORIGIN: "https://app.example.com,https://example.com",
        });

        const { env } = await import("@/env");

        expect(env.CORS_ORIGIN).toBe(
            "https://app.example.com,https://example.com"
        );
    });
});
