import { defineConfig } from "vitest/config";

// Per-workspace reports do not add up, so the consolidated number has to come from a
// single run over every project. Vitest looks for its config from the current directory
// upwards: a workspace that runs `vitest` without a config of its own lands here and
// runs every project in the repo.
export default defineConfig({
    test: {
        projects: ["apps/*/vitest.config.mts", "packages/*/vitest.config.mts"],
        coverage: {
            provider: "v8",
            reportsDirectory: "coverage",
            reporter: ["text-summary", "json-summary", "html"],
            include: ["apps/*/**/*.{ts,tsx}", "packages/*/**/*.{ts,tsx}"],
            exclude: [
                "**/__tests__/**",
                "**/*.config.*",
                "**/*.d.ts",
                "**/.next/**",
                "**/node_modules/**",
                "apps/e2e/**",
            ],
        },
    },
});
