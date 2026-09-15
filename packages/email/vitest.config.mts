import { defineConfig } from "vitest/config";

export default defineConfig({
    // The package tsconfig extends the Next preset (`jsx: "preserve"`), which esbuild
    // refuses to compile on its own, so the JSX runtime has to be named here.
    esbuild: {
        jsx: "automatic",
    },
    test: {
        environment: "node",
        // The 5s default is a wall-clock budget, and this suite mounts dozens of
        // environments in parallel: a test doing ~300ms of real work has been observed
        // taking 7s purely waiting to be scheduled. Loose enough not to produce a false
        // negative, tight enough to still catch a genuine hang.
        testTimeout: 20_000,
    },
});
