import { defineConfig } from "@playwright/test";
import base from "../playwright.config";

// Boots the same emulator-only stack as the suite: a showcase screenshot is published, so
// it can never come from the Firebase project the local .env points at.
export default defineConfig({
    ...base,
    testDir: ".",
    reporter: [["list"]],
    retries: 0,
    use: { ...base.use, trace: "off", video: "off", screenshot: "off" },
    projects: [
        { name: "setup", testDir: "../tests", testMatch: /global\.setup\.ts/ },
        {
            name: "showcase",
            testMatch: /capture\.spec\.ts/,
            dependencies: ["setup"],
        },
    ],
});
