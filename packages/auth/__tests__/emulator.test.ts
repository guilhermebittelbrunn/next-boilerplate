import { afterEach, describe, expect, it, vi } from "vitest";
import {
    authEmulatorHost,
    authEmulatorOrigin,
    firestoreEmulatorHost,
    isEmulated,
} from "../emulator";

afterEach(() => {
    vi.unstubAllEnvs();
});

const clearEmulatorEnv = () => {
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", undefined);
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST", undefined);
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", undefined);
};

describe("authEmulatorHost", () => {
    it("reads the server variable", () => {
        clearEmulatorEnv();
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");

        expect(authEmulatorHost()).toBe("127.0.0.1:9099");
    });

    it("falls back to the public variable so the browser can emulate too", () => {
        clearEmulatorEnv();
        vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");

        expect(authEmulatorHost()).toBe("127.0.0.1:9099");
    });

    it("prefers the server variable over the public one", () => {
        clearEmulatorEnv();
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "server:9099");
        vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST", "browser:9099");

        expect(authEmulatorHost()).toBe("server:9099");
    });

    it("treats an empty string as absent, which is how .env.example opts out", () => {
        clearEmulatorEnv();
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "");
        vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST", "");

        expect(authEmulatorHost()).toBeNull();
    });
});

describe("firestoreEmulatorHost", () => {
    it("treats an empty string as absent", () => {
        clearEmulatorEnv();
        vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");

        expect(firestoreEmulatorHost()).toBeNull();
    });
});

describe("authEmulatorOrigin", () => {
    it("builds a plain-http origin from the host", () => {
        clearEmulatorEnv();
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");

        expect(authEmulatorOrigin()).toBe("http://127.0.0.1:9099");
    });

    it("is null without a host", () => {
        clearEmulatorEnv();

        expect(authEmulatorOrigin()).toBeNull();
    });
});

describe("isEmulated", () => {
    it("is true with only the auth host", () => {
        clearEmulatorEnv();
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");

        expect(isEmulated()).toBe(true);
    });

    it("is true with only the firestore host", () => {
        clearEmulatorEnv();
        vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");

        expect(isEmulated()).toBe(true);
    });

    // The degraded mode: no emulator variables means the real Firebase, exactly as
    // before this existed. It is what every fork that ignores the feature gets.
    it("is false when nothing is set", () => {
        clearEmulatorEnv();

        expect(isEmulated()).toBe(false);
    });

    it("is false when the variables are present but empty", () => {
        clearEmulatorEnv();
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "");
        vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST", "");
        vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");

        expect(isEmulated()).toBe(false);
    });
});
