import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_PROJECT_ID, DEMO_WEB_API_KEY } from "../emulator";

const { getAppsMock, initializeAppMock, getAuthMock, connectAuthEmulatorMock } =
    vi.hoisted(() => ({
        getAppsMock: vi.fn(),
        initializeAppMock: vi.fn(),
        getAuthMock: vi.fn(),
        connectAuthEmulatorMock: vi.fn(),
    }));

vi.mock("firebase/app", () => ({
    getApps: () => getAppsMock(),
    initializeApp: (...args: unknown[]) => initializeAppMock(...args),
}));

vi.mock("firebase/auth", () => ({
    connectAuthEmulator: (...args: unknown[]) =>
        connectAuthEmulatorMock(...args),
    getAuth: (...args: unknown[]) => getAuthMock(...args),
    createUserWithEmailAndPassword: vi.fn(),
    GoogleAuthProvider: class {},
    onAuthStateChanged: vi.fn(),
    onIdTokenChanged: vi.fn(),
    signInWithCustomToken: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
}));

const EMULATOR_HOST = "127.0.0.1:9099";
const EMULATOR_ORIGIN = `http://${EMULATOR_HOST}`;

const REAL_ENV = {
    NEXT_PUBLIC_FIREBASE_API_KEY: "api-key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "auth-domain",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "next-boilerplate-576d0",
    NEXT_PUBLIC_FIREBASE_APP_ID: "app-id",
};

const FIREBASE_ENV_NAMES = [
    ...Object.keys(REAL_ENV),
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
    "FIREBASE_AUTH_EMULATOR_HOST",
    "NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST",
];

function stubEnv(values: Record<string, string>) {
    for (const name of FIREBASE_ENV_NAMES) {
        vi.stubEnv(name, values[name] ?? "");
    }
}

async function authClient() {
    vi.resetModules();
    const { getAuthClient } = await import("../client");
    return getAuthClient();
}

const initializedConfig = () => initializeAppMock.mock.calls[0]?.[0];

beforeEach(() => {
    vi.clearAllMocks();
    getAppsMock.mockReturnValue([]);
    initializeAppMock.mockImplementation((config: unknown) => ({
        name: "created",
        options: config,
    }));
    getAuthMock.mockImplementation((app: unknown) => ({ app }));
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("browser sdk against the emulator", () => {
    it("is a complete configuration on its own, with no NEXT_PUBLIC_FIREBASE_* set", async () => {
        stubEnv({ NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: EMULATOR_HOST });

        const auth = await authClient();

        expect(initializedConfig()).toMatchObject({
            apiKey: DEMO_WEB_API_KEY,
            projectId: DEMO_PROJECT_ID,
        });
        expect(connectAuthEmulatorMock).toHaveBeenCalledWith(
            auth,
            EMULATOR_ORIGIN,
            { disableWarnings: true }
        );
    });

    /**
     * The accounts in the emulator are partitioned by project id, so a fork that emulates
     * while keeping its real public config has to stay on that same id — otherwise the
     * browser and the Admin SDK sign in against two different projects.
     */
    it("keeps a complete real configuration and still redirects to the emulator", async () => {
        stubEnv({
            ...REAL_ENV,
            NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: EMULATOR_HOST,
        });

        await authClient();

        expect(initializedConfig()).toMatchObject({
            projectId: REAL_ENV.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
        expect(connectAuthEmulatorMock).toHaveBeenCalledTimes(1);
    });

    it("reads the server-side variable too", async () => {
        stubEnv({ FIREBASE_AUTH_EMULATOR_HOST: EMULATOR_HOST });

        await authClient();

        expect(connectAuthEmulatorMock).toHaveBeenCalledTimes(1);
    });

    it("connects once even when the instance is requested twice", async () => {
        stubEnv({ NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: EMULATOR_HOST });

        vi.resetModules();
        const { getAuthClient } = await import("../client");
        getAuthClient();
        getAuthClient();

        expect(connectAuthEmulatorMock).toHaveBeenCalledTimes(1);
    });
});

describe("browser sdk against real Firebase", () => {
    it("never redirects when the emulator host is absent", async () => {
        stubEnv(REAL_ENV);

        await authClient();

        expect(initializedConfig()).toMatchObject({
            apiKey: REAL_ENV.NEXT_PUBLIC_FIREBASE_API_KEY,
            projectId: REAL_ENV.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
        expect(connectAuthEmulatorMock).not.toHaveBeenCalled();
    });

    it("treats an empty emulator host as absent", async () => {
        stubEnv({
            ...REAL_ENV,
            NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "",
            FIREBASE_AUTH_EMULATOR_HOST: "",
        });

        await authClient();

        expect(connectAuthEmulatorMock).not.toHaveBeenCalled();
    });
});
