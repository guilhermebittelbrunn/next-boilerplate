// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const SERVICE_ACCOUNT_VARS = [
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY",
] as const;

const RELATED_VARS = [
    ...SERVICE_ACCOUNT_VARS,
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "FIREBASE_WEB_API_KEY",
] as const;

const COMPLETE_SERVICE_ACCOUNT = {
    FIREBASE_ADMIN_PROJECT_ID: "demo-project",
    FIREBASE_ADMIN_CLIENT_EMAIL: "svc@demo-project.iam.gserviceaccount.com",
    FIREBASE_ADMIN_PRIVATE_KEY:
        "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
};

const INVALID_ENV_MESSAGE = /Invalid environment variables/;
const CLIENT_EMAIL_MENTION = /FIREBASE_ADMIN_CLIENT_EMAIL/;
const PRIVATE_KEY_MENTION = /FIREBASE_ADMIN_PRIVATE_KEY/;
const PROJECT_ID_MENTION = /FIREBASE_ADMIN_PROJECT_ID/;

const originalEnv = { ...process.env };

function clearRelatedVars() {
    for (const name of RELATED_VARS) {
        Reflect.deleteProperty(process.env, name);
    }
}

function givenEnv(vars: Record<string, string>) {
    clearRelatedVars();
    Object.assign(process.env, vars);
}

beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    clearRelatedVars();
    Object.assign(process.env, originalEnv);
});

describe("apps/api env", () => {
    it("exposes the service account when the three variables are set", async () => {
        givenEnv(COMPLETE_SERVICE_ACCOUNT);

        const { env } = await import("@/env");

        expect(env.FIREBASE_ADMIN_PROJECT_ID).toBe("demo-project");
        expect(env.FIREBASE_ADMIN_CLIENT_EMAIL).toBe(
            COMPLETE_SERVICE_ACCOUNT.FIREBASE_ADMIN_CLIENT_EMAIL
        );
        expect(env.FIREBASE_ADMIN_PRIVATE_KEY).toContain("BEGIN PRIVATE KEY");
    });

    it("refuses to load without any Firebase service account variable", async () => {
        givenEnv({});

        await expect(import("@/env")).rejects.toThrow(INVALID_ENV_MESSAGE);
    });

    it.each(SERVICE_ACCOUNT_VARS)(
        "refuses to load when %s is missing, naming it",
        async (missing) => {
            const partial = { ...COMPLETE_SERVICE_ACCOUNT } as Record<
                string,
                string
            >;
            delete partial[missing];
            givenEnv(partial);

            await expect(import("@/env")).rejects.toThrow(new RegExp(missing));
        }
    );

    it("refuses a client email that is not an email", async () => {
        givenEnv({
            ...COMPLETE_SERVICE_ACCOUNT,
            FIREBASE_ADMIN_CLIENT_EMAIL: "not-an-email",
        });

        await expect(import("@/env")).rejects.toThrow(CLIENT_EMAIL_MENTION);
    });
});

describe("@repo/auth keys", () => {
    it("tolerates a fully absent service account", async () => {
        givenEnv({ NEXT_PUBLIC_FIREBASE_API_KEY: "public-web-key" });

        const { keys } = await import("@repo/auth/keys");
        const resolved = keys();

        expect(resolved.FIREBASE_ADMIN_PROJECT_ID).toBeUndefined();
        expect(resolved.FIREBASE_ADMIN_CLIENT_EMAIL).toBeUndefined();
        expect(resolved.FIREBASE_ADMIN_PRIVATE_KEY).toBeUndefined();
        expect(resolved.FIREBASE_WEB_API_KEY).toBe("public-web-key");
    });

    it("rejects a half-filled service account, naming what is missing", async () => {
        givenEnv({
            FIREBASE_ADMIN_CLIENT_EMAIL:
                COMPLETE_SERVICE_ACCOUNT.FIREBASE_ADMIN_CLIENT_EMAIL,
        });

        const { keys } = await import("@repo/auth/keys");

        expect(() => keys()).toThrow(PRIVATE_KEY_MENTION);
        expect(() => keys()).toThrow(PROJECT_ID_MENTION);
    });

    it("accepts the public project id as the service account project id", async () => {
        givenEnv({
            FIREBASE_ADMIN_CLIENT_EMAIL:
                COMPLETE_SERVICE_ACCOUNT.FIREBASE_ADMIN_CLIENT_EMAIL,
            FIREBASE_ADMIN_PRIVATE_KEY:
                COMPLETE_SERVICE_ACCOUNT.FIREBASE_ADMIN_PRIVATE_KEY,
            NEXT_PUBLIC_FIREBASE_PROJECT_ID: "public-project",
        });

        const { keys } = await import("@repo/auth/keys");

        expect(keys().FIREBASE_ADMIN_PROJECT_ID).toBe("public-project");
    });
});
