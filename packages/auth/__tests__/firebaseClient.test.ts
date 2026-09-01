import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAppsMock, initializeAppMock, getAuthMock } = vi.hoisted(() => ({
    getAppsMock: vi.fn(),
    initializeAppMock: vi.fn(),
    getAuthMock: vi.fn(),
}));

vi.mock("firebase/app", () => ({
    getApps: () => getAppsMock(),
    initializeApp: (...args: unknown[]) => initializeAppMock(...args),
}));

vi.mock("firebase/auth", () => ({
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

const MISSING_CONFIG_MESSAGE = /NEXT_PUBLIC_FIREBASE_\* environment variables/;

const REQUIRED_ENV = {
    NEXT_PUBLIC_FIREBASE_API_KEY: "api-key",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "auth-domain",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "project-id",
    NEXT_PUBLIC_FIREBASE_APP_ID: "app-id",
};

const OPTIONAL_ENV = {
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "bucket",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "sender",
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "measurement",
};

const ALL_FIREBASE_ENV_NAMES = [
    ...Object.keys(REQUIRED_ENV),
    ...Object.keys(OPTIONAL_ENV),
];

function stubEnv(values: Record<string, string>) {
    for (const name of ALL_FIREBASE_ENV_NAMES) {
        vi.stubEnv(name, values[name] ?? "");
    }
}

async function loadClient() {
    vi.resetModules();
    return await import("../client");
}

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

describe("getAuthClient — configuração completa", () => {
    it("inicializa o app com a configuração lida das variáveis públicas", async () => {
        stubEnv({ ...REQUIRED_ENV, ...OPTIONAL_ENV });

        const { getAuthClient } = await loadClient();
        getAuthClient();

        expect(initializeAppMock).toHaveBeenCalledWith({
            apiKey: "api-key",
            authDomain: "auth-domain",
            projectId: "project-id",
            storageBucket: "bucket",
            messagingSenderId: "sender",
            appId: "app-id",
            measurementId: "measurement",
        });
    });

    it("considera completa a configuração sem as variáveis opcionais", async () => {
        stubEnv(REQUIRED_ENV);

        const { getAuthClient } = await loadClient();
        getAuthClient();

        expect(initializeAppMock).toHaveBeenCalledTimes(1);
        expect(initializeAppMock.mock.calls[0][0]).toMatchObject({
            apiKey: "api-key",
            storageBucket: "",
        });
    });

    it("reaproveita o app que o Firebase já tem registrado", async () => {
        stubEnv(REQUIRED_ENV);
        const existingApp = { name: "already-there" };
        getAppsMock.mockReturnValue([existingApp]);

        const { getAuthClient } = await loadClient();
        getAuthClient();

        expect(initializeAppMock).not.toHaveBeenCalled();
        expect(getAuthMock).toHaveBeenCalledWith(existingApp);
    });

    it("memoiza a instância de auth entre chamadas", async () => {
        stubEnv(REQUIRED_ENV);

        const { getAuthClient } = await loadClient();
        const first = getAuthClient();
        const second = getAuthClient();

        expect(first).toBe(second);
        expect(getAuthMock).toHaveBeenCalledTimes(1);
        expect(initializeAppMock).toHaveBeenCalledTimes(1);
    });
});

describe("getAuthClient — configuração incompleta em desenvolvimento", () => {
    it("avisa listando as variáveis obrigatórias que faltam", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {
            return;
        });
        vi.stubEnv("NODE_ENV", "development");
        stubEnv({
            NEXT_PUBLIC_FIREBASE_API_KEY: "api-key",
            NEXT_PUBLIC_FIREBASE_PROJECT_ID: "project-id",
        });

        const { getAuthClient } = await loadClient();
        getAuthClient();

        const message = warn.mock.calls[0][0] as string;

        expect(message).toContain("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
        expect(message).toContain("NEXT_PUBLIC_FIREBASE_APP_ID");
        expect(message).not.toContain("NEXT_PUBLIC_FIREBASE_API_KEY,");

        warn.mockRestore();
    });

    it("inicializa um app de fachada em vez de propagar o erro", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {
            return;
        });
        vi.stubEnv("NODE_ENV", "development");
        stubEnv({});

        const { getAuthClient } = await loadClient();

        expect(() => getAuthClient()).not.toThrow();
        expect(initializeAppMock).toHaveBeenCalledWith({
            apiKey: "mock",
            authDomain: "mock",
            projectId: "mock",
            appId: "mock",
        });

        warn.mockRestore();
    });
});

describe("getAuthClient — configuração incompleta fora de desenvolvimento", () => {
    it("lança pedindo as variáveis NEXT_PUBLIC_FIREBASE_*", async () => {
        vi.stubEnv("NODE_ENV", "production");
        stubEnv({
            NEXT_PUBLIC_FIREBASE_API_KEY: "api-key",
            NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "auth-domain",
            NEXT_PUBLIC_FIREBASE_PROJECT_ID: "project-id",
        });

        const { getAuthClient } = await loadClient();

        expect(() => getAuthClient()).toThrow(MISSING_CONFIG_MESSAGE);
        expect(initializeAppMock).not.toHaveBeenCalled();
    });

    it("não usa o app de fachada quando o ambiente é de teste", async () => {
        vi.stubEnv("NODE_ENV", "test");
        stubEnv({});

        const { getAuthClient } = await loadClient();

        expect(() => getAuthClient()).toThrow();
    });
});
