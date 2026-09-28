import { beforeEach, describe, expect, it, vi } from "vitest";

const { envMock } = vi.hoisted(() => ({
    envMock: {
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: undefined as string | undefined,
        NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST: undefined as
            | string
            | undefined,
    },
}));

vi.mock("@/env", () => ({ env: envMock }));

const { isStorageEnabled } = await import("@/shared/lib/storageEnabled");

beforeEach(() => {
    envMock.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = undefined;
    envMock.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST = undefined;
});

describe("isStorageEnabled", () => {
    it("is on with a bucket", () => {
        envMock.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET =
            "demo-project.firebasestorage.app";

        expect(isStorageEnabled()).toBe(true);
    });

    it("is on with only the storage emulator host", () => {
        envMock.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";

        expect(isStorageEnabled()).toBe(true);
    });

    it("is off with neither", () => {
        expect(isStorageEnabled()).toBe(false);
    });

    it("treats empty strings as absent, which is how .env.example opts out", () => {
        envMock.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "";
        envMock.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST = "";

        expect(isStorageEnabled()).toBe(false);
    });
});
