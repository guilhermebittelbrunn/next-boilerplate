import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestMock, defaultHeaders } = vi.hoisted(() => ({
    requestMock: vi.fn(),
    defaultHeaders: [] as Record<string, unknown>[],
}));

vi.mock("axios", async (importOriginal) => {
    const actual = await importOriginal<typeof import("axios")>();
    const create = () => {
        const common: Record<string, unknown> = {};
        defaultHeaders.push(common);
        return {
            defaults: { headers: { common } },
            interceptors: { response: { use: vi.fn() } },
            request: (config: unknown) => requestMock(config, { ...common }),
        };
    };
    return {
        ...actual,
        default: { ...actual.default, create },
    };
});

const { createSessionAuthority } = await import(
    "../src/client/sessionAuthority"
);

const API_URL = "http://localhost:3002";
const CREDENTIAL = "session-cookie";
const STATUS_UNAUTHORIZED = 401;
const STATUS_FORBIDDEN = 403;
const STATUS_SERVER_ERROR = 500;
const BROWSER_UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";

function apiError(status: number, code?: string): AxiosError {
    const headers = new AxiosHeaders();
    const config = { headers };
    return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
        status,
        statusText: "Error",
        headers,
        config,
        data: code ? { error: { code } } : {},
    } as never);
}

beforeEach(() => {
    requestMock.mockReset();
    defaultHeaders.length = 0;
});

describe("createSessionAuthority().check", () => {
    it("answers active when the API confirms the session", async () => {
        requestMock.mockResolvedValue({ data: { data: { active: true } } });

        const standing = await createSessionAuthority(API_URL, "app").check(
            CREDENTIAL,
            BROWSER_UA
        );

        expect(standing).toBe("active");
    });

    it("answers revoked only for 401 AUTH_SESSION_REVOKED", async () => {
        requestMock.mockRejectedValue(
            apiError(STATUS_UNAUTHORIZED, "AUTH_SESSION_REVOKED")
        );

        const standing = await createSessionAuthority(API_URL, "app").check(
            CREDENTIAL,
            BROWSER_UA
        );

        expect(standing).toBe("revoked");
    });

    it("answers unknown for any other refusal or failure", async () => {
        for (const failure of [
            apiError(STATUS_UNAUTHORIZED, "AUTH_INVALID_TOKEN"),
            apiError(STATUS_SERVER_ERROR),
            apiError(STATUS_FORBIDDEN, "AUTH_SESSION_REVOKED"),
            new Error("socket hang up"),
        ]) {
            requestMock.mockRejectedValueOnce(failure);

            const standing = await createSessionAuthority(API_URL, "web").check(
                CREDENTIAL,
                BROWSER_UA
            );

            expect(standing).toBe("unknown");
        }
    });

    it("answers unknown without calling anything when the API URL is missing", async () => {
        const standing = await createSessionAuthority(undefined, "app").check(
            CREDENTIAL,
            BROWSER_UA
        );

        expect(standing).toBe("unknown");
        expect(requestMock).not.toHaveBeenCalled();
    });

    it("sends the credential as bearer and the browser user agent", async () => {
        requestMock.mockResolvedValue({ data: { data: { active: true } } });

        await createSessionAuthority(API_URL, "app").check(
            CREDENTIAL,
            BROWSER_UA
        );

        const [config, headers] = requestMock.mock.calls[0] as [
            { url: string; method: string; timeout: number },
            Record<string, unknown>,
        ];
        expect(config).toMatchObject({ url: "/auth/session", method: "GET" });
        expect(config.timeout).toBeGreaterThan(0);
        expect(headers.Authorization).toBe(`Bearer ${CREDENTIAL}`);
        expect(headers["User-Agent"]).toBe(BROWSER_UA);
    });

    it("does not reuse one client across calls", async () => {
        requestMock.mockResolvedValue({ data: { data: { active: true } } });
        const authority = createSessionAuthority(API_URL, "app");

        await authority.check("first", null);
        await authority.check("second", null);

        const [, firstHeaders] = requestMock.mock.calls[0] as [
            unknown,
            Record<string, unknown>,
        ];
        const [, secondHeaders] = requestMock.mock.calls[1] as [
            unknown,
            Record<string, unknown>,
        ];
        expect(firstHeaders.Authorization).toBe("Bearer first");
        expect(secondHeaders.Authorization).toBe("Bearer second");
        expect(secondHeaders["User-Agent"]).toBeUndefined();
    });
});

describe("createSessionAuthority().end", () => {
    it("asks the API to end the session", async () => {
        requestMock.mockResolvedValue({ data: null });

        await createSessionAuthority(API_URL, "app").end(CREDENTIAL);

        const [config, headers] = requestMock.mock.calls[0] as [
            { url: string; method: string },
            Record<string, unknown>,
        ];
        expect(config).toMatchObject({
            url: "/auth/session",
            method: "DELETE",
        });
        expect(headers.Authorization).toBe(`Bearer ${CREDENTIAL}`);
    });

    it("swallows a failure so signing out still completes", async () => {
        requestMock.mockRejectedValue(new Error("api down"));

        await expect(
            createSessionAuthority(API_URL, "app").end(CREDENTIAL)
        ).resolves.toBeUndefined();
    });

    it("does nothing without an API URL", async () => {
        await createSessionAuthority(undefined, "app").end(CREDENTIAL);

        expect(requestMock).not.toHaveBeenCalled();
    });
});
