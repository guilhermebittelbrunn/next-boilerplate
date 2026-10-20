import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getMergedUserByUidMock } = vi.hoisted(() => ({
    getMergedUserByUidMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/(shared)/lib/user-merge", () => ({
    getMergedUserByUid: (...args: unknown[]) => getMergedUserByUidMock(...args),
}));

const { POST } = await import("@/app/(routes)/auth/sign-in/google/route");

const ID_TOKEN = "google-id-token";
const DISABLED_ACCOUNT_BODY = {
    error: {
        code: HTTP_STATUS.BAD_REQUEST,
        message: "USER_DISABLED",
        errors: [
            { message: "USER_DISABLED", reason: "invalid", domain: "global" },
        ],
    },
};

let fetchMock: ReturnType<typeof vi.fn>;

function signInRequest(): Request {
    return new Request("http://localhost:3002/auth/sign-in/google", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken: ID_TOKEN }),
    });
}

function providerAnswers(status: number, body: unknown) {
    fetchMock.mockResolvedValue(
        new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
        })
    );
}

beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", undefined);
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST", undefined);
    vi.stubEnv("FIREBASE_WEB_API_KEY", "real-key");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", undefined);
    getMergedUserByUidMock.mockReset();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe("POST /auth/sign-in/google — Identity Toolkit real", () => {
    it("responde 400 AUTH_INVALID_CREDENTIALS sem a chave web fora do emulador, sem citar a variável", async () => {
        vi.stubEnv("FIREBASE_WEB_API_KEY", undefined);

        const response = await POST(signInRequest());
        const raw = await response.text();

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(JSON.parse(raw)).toEqual({
            error: { code: "AUTH_INVALID_CREDENTIALS" },
        });
        expect(raw).not.toContain("FIREBASE_WEB_API_KEY");
        expect(raw).not.toContain("NEXT_PUBLIC_FIREBASE_API_KEY");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("responde 400 AUTH_INVALID_CREDENTIALS quando o provedor recusa a conta desativada", async () => {
        providerAnswers(HTTP_STATUS.BAD_REQUEST, DISABLED_ACCOUNT_BODY);

        const response = await POST(signInRequest());
        const raw = await response.text();

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(JSON.parse(raw)).toEqual({
            error: { code: "AUTH_INVALID_CREDENTIALS" },
        });
        expect(raw).not.toContain("USER_DISABLED");
        expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
            "/accounts:signInWithIdp?key=real-key"
        );
        expect(getMergedUserByUidMock).not.toHaveBeenCalled();
    });

    it("responde 400 AUTH_INVALID_CREDENTIALS quando o provedor aceita sem devolver a sessão", async () => {
        providerAnswers(HTTP_STATUS.OK, { localId: "uid-google-1" });

        const response = await POST(signInRequest());

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        await expect(response.json()).resolves.toEqual({
            error: { code: "AUTH_INVALID_CREDENTIALS" },
        });
        expect(getMergedUserByUidMock).not.toHaveBeenCalled();
    });
});
