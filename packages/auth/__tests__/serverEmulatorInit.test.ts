import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_PROJECT_ID } from "../emulator";

const { keysMock, certMock, initializeAppMock, getAppsMock } = vi.hoisted(
    () => ({
        keysMock: vi.fn(),
        certMock: vi.fn((..._args: unknown[]) => null),
        initializeAppMock: vi.fn((..._args: unknown[]) => ({
            name: "[DEFAULT]",
        })),
        getAppsMock: vi.fn(() => [] as unknown[]),
    })
);

vi.mock("server-only", () => ({}));

vi.mock("../keys", () => ({ keys: () => keysMock() }));

vi.mock("firebase-admin/app", () => ({
    cert: (...args: unknown[]) => certMock(...args),
    getApps: () => getAppsMock(),
    initializeApp: (...args: unknown[]) => initializeAppMock(...args),
}));

vi.mock("firebase-admin/auth", () => ({ getAuth: vi.fn() }));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase-admin/storage", () => ({ getStorage: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const NO_SERVICE_ACCOUNT = {
    FIREBASE_ADMIN_PROJECT_ID: undefined,
    FIREBASE_ADMIN_CLIENT_EMAIL: undefined,
    FIREBASE_ADMIN_PRIVATE_KEY: undefined,
};

const SERVICE_ACCOUNT = {
    FIREBASE_ADMIN_PROJECT_ID: "next-boilerplate-576d0",
    FIREBASE_ADMIN_CLIENT_EMAIL: "admin@project.iam.gserviceaccount.com",
    FIREBASE_ADMIN_PRIVATE_KEY: "line-one\\nline-two",
};

const MISSING_CREDENTIALS = /Firebase Admin credentials are not configured/;

const clearEmulatorEnv = () => {
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", undefined);
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST", undefined);
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", undefined);
};

const initAdminApp = async () => {
    vi.resetModules();
    const { getFirestoreAdmin } = await import("../server");
    getFirestoreAdmin();
};

beforeEach(() => {
    vi.clearAllMocks();
    clearEmulatorEnv();
    keysMock.mockReturnValue(NO_SERVICE_ACCOUNT);
    getAppsMock.mockReturnValue([]);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("admin app against the emulators", () => {
    it.each([
        ["FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099"],
        ["FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080"],
    ])(
        "initializes with the demo project and no credential when %s is set",
        async (variable, host) => {
            vi.stubEnv(variable, host);

            await initAdminApp();

            expect(initializeAppMock).toHaveBeenCalledWith({
                projectId: DEMO_PROJECT_ID,
            });
            expect(certMock).not.toHaveBeenCalled();
        }
    );

    it("keeps the configured project id so both sides sit on the same project", async () => {
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");
        keysMock.mockReturnValue(SERVICE_ACCOUNT);

        await initAdminApp();

        expect(initializeAppMock).toHaveBeenCalledWith({
            projectId: SERVICE_ACCOUNT.FIREBASE_ADMIN_PROJECT_ID,
        });
        expect(certMock).not.toHaveBeenCalled();
    });

    it("reuses an app the Firebase SDK already registered", async () => {
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");
        getAppsMock.mockReturnValue([{ name: "[DEFAULT]" }]);

        await initAdminApp();

        expect(initializeAppMock).not.toHaveBeenCalled();
    });

    it("ignores emulator hosts that are present but empty", async () => {
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "");
        vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");

        await expect(initAdminApp()).rejects.toThrow(MISSING_CREDENTIALS);
    });
});

describe("admin app against a real project", () => {
    it("still refuses to start without a service account", async () => {
        await expect(initAdminApp()).rejects.toThrow(MISSING_CREDENTIALS);
        expect(initializeAppMock).not.toHaveBeenCalled();
    });

    it("still signs in with the service account certificate", async () => {
        keysMock.mockReturnValue(SERVICE_ACCOUNT);

        await initAdminApp();

        expect(certMock).toHaveBeenCalledWith({
            projectId: SERVICE_ACCOUNT.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: SERVICE_ACCOUNT.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: "line-one\nline-two",
        });
    });
});
