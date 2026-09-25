import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    assertEmulatorTarget,
    buildStackEnv,
    DEMO_PROJECT_ID,
} from "../support/stackEnv";

const urls = {
    app: "http://localhost:4000",
    web: "http://localhost:4001",
    api: "http://localhost:4002",
};

const REAL_PROJECT_REFUSAL =
    /Refusing to seed: the target project is "my-real-project"/;
const NOT_AN_EMULATOR_TARGET = /apps\/app is not an emulator target/;
const MENTIONS_REAL_PROJECT = /my-real-project/;

let appsRoot: string;

const writeEnv = (app: string, file: string, lines: string[]) => {
    mkdirSync(path.join(appsRoot, app), { recursive: true });
    writeFileSync(path.join(appsRoot, app, file), `${lines.join("\n")}\n`);
};

beforeEach(() => {
    appsRoot = mkdtempSync(path.join(tmpdir(), "e2e-stack-env-"));
});

afterEach(() => {
    rmSync(appsRoot, { recursive: true, force: true });
});

describe("buildStackEnv", () => {
    it("keeps the .env.example values and blanks keys that only the local files define", () => {
        writeEnv("api", ".env.example", [
            'RESEND_FROM=""',
            'VERCEL_PROJECT_PRODUCTION_URL="http://localhost:3002"',
        ]);
        writeEnv("api", ".env", [
            'RESEND_FROM="real@example.com"',
            'DATABASE_URL="postgres://real"',
        ]);
        writeEnv("api", ".env.local", ['LOCAL_ONLY_SECRET="secret"']);

        const env = buildStackEnv("api", { appsRoot, urls });

        expect(env.RESEND_FROM).toBe("");
        expect(env.VERCEL_PROJECT_PRODUCTION_URL).toBe("http://localhost:3002");
        expect(env.DATABASE_URL).toBe("");
        expect(env.LOCAL_ONLY_SECRET).toBe("");
    });

    it("forces the emulator block and blanks the real Firebase credentials", () => {
        writeEnv("app", ".env.example", [
            'NEXT_PUBLIC_FIREBASE_PROJECT_ID="demo-next-boilerplate"',
        ]);
        writeEnv("app", ".env", [
            'NEXT_PUBLIC_FIREBASE_PROJECT_ID="my-real-project"',
            'NEXT_PUBLIC_FIREBASE_API_KEY="AIza-real"',
            'FIREBASE_ADMIN_PROJECT_ID="my-real-project"',
            'FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----"',
            'ARCJET_KEY="ajkey_real"',
        ]);

        const env = buildStackEnv("app", { appsRoot, urls });

        expect(env).toMatchObject({
            FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
            FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
            NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
            NEXT_PUBLIC_FIREBASE_PROJECT_ID: DEMO_PROJECT_ID,
            NEXT_PUBLIC_FIREBASE_API_KEY: "",
            FIREBASE_ADMIN_PROJECT_ID: "",
            FIREBASE_ADMIN_PRIVATE_KEY: "",
            ARCJET_KEY: "",
            ONBOARDING_ENABLED: "",
            NEXT_TELEMETRY_DISABLED: "1",
        });
    });

    it("points each app at the other two", () => {
        writeEnv("api", ".env.example", [
            'CORS_ORIGIN="http://localhost:3000"',
        ]);
        writeEnv("app", ".env.example", ['NEXT_PUBLIC_API_URL="x"']);
        writeEnv("web", ".env.example", ['NEXT_PUBLIC_APP_URL=""']);

        expect(buildStackEnv("api", { appsRoot, urls })).toMatchObject({
            CORS_ORIGIN: `${urls.app},${urls.web}`,
            NEXT_PUBLIC_APP_URL: urls.app,
        });
        expect(buildStackEnv("app", { appsRoot, urls })).toMatchObject({
            NEXT_PUBLIC_API_URL: urls.api,
            NEXT_PUBLIC_APP_URL: urls.app,
        });
        // An empty app URL is what sends the landing CTA to the web sign-up page.
        expect(
            buildStackEnv("web", { appsRoot, urls }).NEXT_PUBLIC_APP_URL
        ).toBe("");
    });

    it("works without any local env file", () => {
        writeEnv("web", ".env.example", ['NEXT_PUBLIC_WEB_URL=""']);

        expect(() => buildStackEnv("web", { appsRoot, urls })).not.toThrow();
    });
});

describe("assertEmulatorTarget", () => {
    const emulated = {
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: DEMO_PROJECT_ID,
    };

    it("accepts the emulator block", () => {
        expect(() => assertEmulatorTarget("api", emulated)).not.toThrow();
    });

    it("refuses a project id outside demo-*", () => {
        expect(() =>
            assertEmulatorTarget("api", {
                ...emulated,
                NEXT_PUBLIC_FIREBASE_PROJECT_ID: "my-real-project",
            })
        ).toThrow(REAL_PROJECT_REFUSAL);
    });

    it("refuses when an emulator host is empty", () => {
        expect(() =>
            assertEmulatorTarget("app", {
                ...emulated,
                FIRESTORE_EMULATOR_HOST: "",
            })
        ).toThrow(NOT_AN_EMULATOR_TARGET);
    });

    it("refuses a real admin project id even when the public one is demo-*", () => {
        expect(() =>
            assertEmulatorTarget("api", {
                ...emulated,
                FIREBASE_ADMIN_PROJECT_ID: "my-real-project",
            })
        ).toThrow(MENTIONS_REAL_PROJECT);
    });
});
