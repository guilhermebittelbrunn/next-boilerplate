import { defineConfig, devices } from "@playwright/test";
import { REPO_ROOT } from "./support/paths";
import { buildStackEnv } from "./support/stackEnv";
import {
    API_PORT,
    API_URL,
    APP_PORT,
    APP_URL,
    AUTH_EMULATOR_HOST,
    WEB_PORT,
    WEB_URL,
} from "./support/urls";

const isCi = Boolean(process.env.CI);
const SERVER_START_TIMEOUT = 300_000;

// Building these throws before any server starts when one of them could reach a real
// Firebase project.
const stackEnv = {
    api: buildStackEnv("api"),
    app: buildStackEnv("app"),
    web: buildStackEnv("web"),
};

export default defineConfig({
    testDir: "./tests",
    fullyParallel: false,
    workers: 1,
    forbidOnly: isCi,
    retries: isCi ? 1 : 0,
    failOnFlakyTests: isCi,
    timeout: 120_000,
    // `next dev` compiles each route on its first request, and that first compile can
    // take tens of seconds; the budget covers it without a single fixed sleep.
    expect: { timeout: 30_000 },
    reporter: isCi
        ? [["github"], ["list"], ["html", { open: "never" }]]
        : [["list"], ["html", { open: "never" }]],
    use: {
        baseURL: APP_URL,
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
        colorScheme: "light",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        navigationTimeout: 60_000,
    },
    projects: [
        { name: "setup", testMatch: /global\.setup\.ts/ },
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
            dependencies: ["setup"],
        },
    ],
    webServer: [
        {
            name: "emulators",
            command: "pnpm emulators",
            cwd: REPO_ROOT,
            // Auth starts after Firestore, so answering here means both are up.
            url: `http://${AUTH_EMULATOR_HOST}/`,
            reuseExistingServer: true,
            // The Firestore emulator runs as a detached Java process: killing the
            // process group leaves it listening on 8080, while SIGINT lets
            // firebase-tools shut every emulator down.
            gracefulShutdown: { signal: "SIGINT", timeout: 15_000 },
            timeout: SERVER_START_TIMEOUT,
            stdout: "pipe",
        },
        {
            name: "api",
            command: `pnpm --filter api exec next dev -p ${API_PORT}`,
            cwd: REPO_ROOT,
            url: `${API_URL}/health/ready`,
            env: stackEnv.api,
            // A server already listening may be a `pnpm dev` holding the local .env,
            // which is exactly what this suite must not talk to.
            reuseExistingServer: false,
            timeout: SERVER_START_TIMEOUT,
            stdout: "pipe",
        },
        {
            name: "app",
            command: `pnpm --filter app exec next dev -p ${APP_PORT}`,
            cwd: REPO_ROOT,
            url: `${APP_URL}/pt-br/sign-in`,
            env: stackEnv.app,
            reuseExistingServer: false,
            timeout: SERVER_START_TIMEOUT,
            stdout: "pipe",
        },
        {
            name: "web",
            command: `pnpm --filter web exec next dev -p ${WEB_PORT}`,
            cwd: REPO_ROOT,
            url: `${WEB_URL}/pt-br`,
            env: stackEnv.web,
            reuseExistingServer: false,
            timeout: SERVER_START_TIMEOUT,
            stdout: "pipe",
        },
    ],
});
