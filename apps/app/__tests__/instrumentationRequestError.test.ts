import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { onRequestError } = await import("@/instrumentation");

const errorRequest = { path: "/pt-br/entities", method: "GET", headers: {} };
const errorContext = {
    routerKind: "App Router",
    routePath: "/[locale]/entities",
    routeType: "render",
    revalidateReason: undefined,
} as const;

const silence = (method: "warn" | "error") =>
    vi.spyOn(console, method).mockImplementation(() => {
        // read by the assertions below, kept out of the test output
    });

let warn: ReturnType<typeof silence>;
let error: ReturnType<typeof silence>;

beforeEach(() => {
    warn = silence("warn");
    error = silence("error");
});

afterEach(() => {
    warn.mockRestore();
    error.mockRestore();
});

describe("instrumentation onRequestError", () => {
    it("is exported so the runtime has a hook to call", () => {
        expect(typeof onRequestError).toBe("function");
    });

    it("emits one structured line naming route, method and digest", () => {
        onRequestError?.(
            Object.assign(new Error("boom"), { digest: "1837465920" }),
            errorRequest,
            errorContext
        );

        expect(warn).toHaveBeenCalledWith(
            "[request] failed method=GET path=/pt-br/entities routeType=render digest=1837465920"
        );
    });

    it("carries the identifier the caller was shown", () => {
        onRequestError?.(
            new Error("boom"),
            {
                ...errorRequest,
                headers: {
                    "x-request-id": "3f2a1b8c-0f4a-4d0a-9e77-9f5f0a3a1c22",
                },
            },
            errorContext
        );

        expect(warn).toHaveBeenCalledWith(
            "[request] failed method=GET path=/pt-br/entities routeType=render requestId=3f2a1b8c-0f4a-4d0a-9e77-9f5f0a3a1c22"
        );
    });

    /**
     * The panel searches records by e-mail, and the query string reaches the hook
     * glued to the path, so retaining it would put an address in the log.
     */
    it("drops the query string from the path", () => {
        onRequestError?.(
            new Error("boom"),
            {
                ...errorRequest,
                path: "/pt-br/users?search=alguem%40example.com",
            },
            errorContext
        );

        expect(warn).toHaveBeenCalledWith(
            "[request] failed method=GET path=/pt-br/users routeType=render"
        );
    });

    it("survives a value that is not an error at all", () => {
        expect(() =>
            onRequestError?.("just a string", errorRequest, errorContext)
        ).not.toThrow();
    });
});
