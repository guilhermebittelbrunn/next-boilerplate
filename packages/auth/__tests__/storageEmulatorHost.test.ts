import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    DEMO_PROJECT_ID,
    DEMO_STORAGE_BUCKET,
    isEmulated,
    storageEmulatorHost,
} from "../emulator";

const STORAGE_HOST = "127.0.0.1:9199";

const EMULATOR_VARIABLES = [
    "FIREBASE_AUTH_EMULATOR_HOST",
    "NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST",
    "FIRESTORE_EMULATOR_HOST",
    "FIREBASE_STORAGE_EMULATOR_HOST",
    "NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST",
    "STORAGE_EMULATOR_HOST",
];

beforeEach(() => {
    for (const variable of EMULATOR_VARIABLES) {
        vi.stubEnv(variable, undefined);
    }
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("storageEmulatorHost", () => {
    it("reads the variable firebase-admin reads", () => {
        vi.stubEnv("FIREBASE_STORAGE_EMULATOR_HOST", STORAGE_HOST);

        expect(storageEmulatorHost()).toBe(STORAGE_HOST);
    });

    it("treats an empty string as absent, which is how .env.example opts out", () => {
        vi.stubEnv("FIREBASE_STORAGE_EMULATOR_HOST", "");

        expect(storageEmulatorHost()).toBeNull();
    });

    it.each([
        "NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST",
        "STORAGE_EMULATOR_HOST",
    ])(
        "ignores %s, which the Admin SDK would not honour the same way",
        (variable) => {
            vi.stubEnv(variable, STORAGE_HOST);

            expect(storageEmulatorHost()).toBeNull();
        }
    );
});

describe("isEmulated with only the storage emulator host", () => {
    it("stays false, so Auth and Firestore keep asking for real credentials", () => {
        vi.stubEnv("FIREBASE_STORAGE_EMULATOR_HOST", STORAGE_HOST);

        expect(isEmulated()).toBe(false);
    });
});

describe("DEMO_STORAGE_BUCKET", () => {
    it("belongs to the demo project", () => {
        expect(DEMO_STORAGE_BUCKET).toBe(`${DEMO_PROJECT_ID}.appspot.com`);
    });
});
