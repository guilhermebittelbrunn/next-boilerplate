import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        // These need the Firestore and Storage emulators running; `test:emulator` owns them.
        exclude: [...configDefaults.exclude, "**/*.emulator.test.ts"],
        // The 5s default is a wall-clock budget, and this suite mounts dozens of
        // environments in parallel: a test doing ~300ms of real work has been observed
        // taking 7s purely waiting to be scheduled. Loose enough not to produce a false
        // negative, tight enough to still catch a genuine hang.
        testTimeout: 20_000,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
            "@repo": path.resolve(__dirname, "../../packages"),
        },
    },
});
