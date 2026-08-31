import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getFirestoreAdminMock } = vi.hoisted(() => ({
    getFirestoreAdminMock: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
    getFirestoreAdmin: getFirestoreAdminMock,
}));

const { register } = await import("@/instrumentation");

const MISSING_CREDENTIALS_MESSAGE =
    /Firebase Admin credentials are not configured/;

const originalRuntime = process.env.NEXT_RUNTIME;

beforeEach(() => {
    getFirestoreAdminMock.mockReset();
    getFirestoreAdminMock.mockReturnValue({});
});

afterEach(() => {
    if (originalRuntime === undefined) {
        Reflect.deleteProperty(process.env, "NEXT_RUNTIME");
        return;
    }
    process.env.NEXT_RUNTIME = originalRuntime;
});

describe("instrumentation register", () => {
    it("resolves the Firestore instance when the server boots", async () => {
        process.env.NEXT_RUNTIME = "nodejs";

        await register();

        expect(getFirestoreAdminMock).toHaveBeenCalledTimes(1);
    });

    it("crashes the boot when the service account is not configured", async () => {
        process.env.NEXT_RUNTIME = "nodejs";
        getFirestoreAdminMock.mockImplementation(() => {
            throw new Error(
                "Firebase Admin credentials are not configured. Please set FIREBASE_ADMIN_* environment variables."
            );
        });

        await expect(register()).rejects.toThrow(MISSING_CREDENTIALS_MESSAGE);
    });

    it("stays out of the way on the edge runtime", async () => {
        process.env.NEXT_RUNTIME = "edge";

        await register();

        expect(getFirestoreAdminMock).not.toHaveBeenCalled();
    });
});
