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
    "FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
] as const;

const BUCKET = "demo-project.firebasestorage.app";

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

    /**
     * `.env.example` ships the bucket empty, which is how a fork declares it does not
     * want uploads. Treating that as a malformed value would refuse to boot the API
     * over a feature the fork opted out of.
     */
    it("boots with the bucket left empty and reports no bucket", async () => {
        givenEnv({ ...COMPLETE_SERVICE_ACCOUNT, FIREBASE_STORAGE_BUCKET: "" });

        const { env } = await import("@/env");

        expect(env.FIREBASE_STORAGE_BUCKET).toBeUndefined();
    });

    it("falls back to the public bucket variable when the server one is empty", async () => {
        givenEnv({
            ...COMPLETE_SERVICE_ACCOUNT,
            FIREBASE_STORAGE_BUCKET: "",
            NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: BUCKET,
        });

        const { env } = await import("@/env");

        expect(env.FIREBASE_STORAGE_BUCKET).toBe(BUCKET);
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

    it("reads an empty bucket as no bucket instead of an invalid one", async () => {
        givenEnv({ ...COMPLETE_SERVICE_ACCOUNT, FIREBASE_STORAGE_BUCKET: "" });

        const { keys } = await import("@repo/auth/keys");

        expect(keys().FIREBASE_STORAGE_BUCKET).toBeUndefined();
    });

    /**
     * `.env.example` ships the web API key empty too, so copying it and filling only the
     * service account has to leave the process able to start.
     */
    it("reads an empty web api key as absent instead of refusing to start", async () => {
        givenEnv({ ...COMPLETE_SERVICE_ACCOUNT, FIREBASE_WEB_API_KEY: "" });

        const { keys } = await import("@repo/auth/keys");

        expect(() => keys()).not.toThrow();
        expect(keys().FIREBASE_WEB_API_KEY).toBeUndefined();
    });

    it("falls back to the public api key when the server one is empty", async () => {
        givenEnv({
            ...COMPLETE_SERVICE_ACCOUNT,
            FIREBASE_WEB_API_KEY: "",
            NEXT_PUBLIC_FIREBASE_API_KEY: "public-web-key",
        });

        const { keys } = await import("@repo/auth/keys");

        expect(keys().FIREBASE_WEB_API_KEY).toBe("public-web-key");
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
