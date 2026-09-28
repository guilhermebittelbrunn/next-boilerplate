import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

const firebaseJson = JSON.parse(
    readFileSync(path.resolve(__dirname, "../../firebase.json"), "utf8")
);
const loopback = (port: number) => `127.0.0.1:${port}`;

export default defineConfig({
    test: {
        environment: "node",
        include: ["__tests__/**/*.emulator.test.ts"],
        setupFiles: ["__tests__/emulatorGuard.emulator-setup.ts"],
        // Every file shares the same two emulators and sweeps up after itself by prefix.
        fileParallelism: false,
        testTimeout: 30_000,
        hookTimeout: 30_000,
        // Emptied so Application Default Credentials find nothing to authenticate with,
        // whatever the shell or a local .env exports: nothing here may reach Google.
        // Without METADATA_SERVER_DETECTION the Admin Firestore client still probes the
        // Compute Engine metadata server (169.254.169.254) while looking for credentials.
        env: {
            METADATA_SERVER_DETECTION: "none",
            FIRESTORE_EMULATOR_HOST: loopback(
                firebaseJson.emulators.firestore.port
            ),
            FIREBASE_STORAGE_EMULATOR_HOST: loopback(
                firebaseJson.emulators.storage.port
            ),
            STORAGE_EMULATOR_HOST: "",
            FIREBASE_AUTH_EMULATOR_HOST: "",
            NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "",
            GCLOUD_PROJECT: "demo-next-boilerplate",
            GOOGLE_APPLICATION_CREDENTIALS: "",
            FIREBASE_ADMIN_PROJECT_ID: "",
            FIREBASE_ADMIN_CLIENT_EMAIL: "",
            FIREBASE_ADMIN_PRIVATE_KEY: "",
            NEXT_PUBLIC_FIREBASE_PROJECT_ID: "",
            FIREBASE_STORAGE_BUCKET: "",
            NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "",
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
            "@repo": path.resolve(__dirname, "../../packages"),
        },
    },
});
