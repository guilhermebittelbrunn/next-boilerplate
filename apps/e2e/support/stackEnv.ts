import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import {
    readEmulatorTarget,
    refuseSeedReason,
} from "../../api/scripts/emulatorTarget.mjs";
import { APPS_ROOT } from "./paths";
import {
    AUTH_EMULATOR_HOST,
    FIRESTORE_EMULATOR_HOST,
    STACK_URLS,
    type StackUrls,
} from "./urls";

export type StackApp = "api" | "app" | "web";

export const DEMO_PROJECT_ID = "demo-next-boilerplate";

const LOCAL_ENV_FILES = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.development.local",
];

const EMULATOR_BLOCK = {
    FIRESTORE_EMULATOR_HOST,
    FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST,
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: DEMO_PROJECT_ID,
};

const OFFLINE_BLOCK = {
    NEXT_TELEMETRY_DISABLED: "1",
};

// Empty rather than absent: Next reads process.env before any .env file, so an empty
// value is what keeps a real key in the local file from being loaded. The Firebase
// client also prefers a filled NEXT_PUBLIC_FIREBASE_* config over the emulator one,
// which would put accounts on the wrong project id.
const FORCED_EMPTY = [
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
    "ARCJET_KEY",
    "ONBOARDING_ENABLED",
];

const crossAppUrls = (
    app: StackApp,
    urls: StackUrls
): Record<string, string> => {
    if (app === "api") {
        return {
            CORS_ORIGIN: `${urls.app},${urls.web}`,
            NEXT_PUBLIC_APP_URL: urls.app,
            NEXT_PUBLIC_WEB_URL: urls.web,
        };
    }
    if (app === "app") {
        return {
            NEXT_PUBLIC_API_URL: urls.api,
            NEXT_PUBLIC_APP_URL: urls.app,
            NEXT_PUBLIC_WEB_URL: urls.web,
            VERCEL_PROJECT_PRODUCTION_URL: urls.app,
        };
    }
    return {};
};

const readEnvFile = (filePath: string): Record<string, string> => {
    if (!existsSync(filePath)) {
        return {};
    }
    const parsed = parseEnv(readFileSync(filePath, "utf8"));
    return Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, value ?? ""])
    );
};

/** Throws with the seed's own refusal when the environment could reach a real project. */
export const assertEmulatorTarget = (
    app: StackApp,
    env: Record<string, string | undefined>
) => {
    const reason = refuseSeedReason(readEmulatorTarget(env));
    if (reason) {
        throw new Error(
            `The e2e environment for apps/${app} is not an emulator target.\n\n${reason}`
        );
    }
};

type BuildStackEnvOptions = {
    appsRoot?: string;
    urls?: StackUrls;
};

/**
 * The server environment is rebuilt from `.env.example` on every run, so whatever the
 * local `.env` points at (possibly a real Firebase project) never reaches the suite.
 */
export const buildStackEnv = (
    app: StackApp,
    { appsRoot = APPS_ROOT, urls = STACK_URLS }: BuildStackEnvOptions = {}
): Record<string, string> => {
    const appDir = path.join(appsRoot, app);
    const example = readEnvFile(path.join(appDir, ".env.example"));

    const env: Record<string, string> = {};
    for (const file of LOCAL_ENV_FILES) {
        for (const key of Object.keys(readEnvFile(path.join(appDir, file)))) {
            env[key] = "";
        }
    }
    Object.assign(env, example);
    for (const key of FORCED_EMPTY) {
        env[key] = "";
    }
    Object.assign(env, EMULATOR_BLOCK, OFFLINE_BLOCK, crossAppUrls(app, urls));

    assertEmulatorTarget(app, env);
    return env;
};
