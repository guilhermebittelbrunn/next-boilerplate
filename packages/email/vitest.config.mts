import { defineConfig } from "vitest/config";

export default defineConfig({
    // The package tsconfig extends the Next preset (`jsx: "preserve"`), which esbuild
    // refuses to compile on its own, so the JSX runtime has to be named here.
    esbuild: {
        jsx: "automatic",
    },
    test: {
        environment: "node",
    },
});
