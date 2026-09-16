import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { onRequestError } = await import("@/instrumentation");

const errorRequest = { path: "/pt-br", method: "GET", headers: {} };
const errorContext = {
    routerKind: "App Router",
    routePath: "/[locale]",
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
            "[request] failed method=GET path=/pt-br routeType=render digest=1837465920"
        );
    });

    /**
     * The landing page carries the contact form, whose values reach the hook glued
     * to the path when a submission throws.
     */
    it("drops the query string from the path", () => {
        onRequestError?.(
            new Error("boom"),
            {
                ...errorRequest,
                path: "/pt-br/contact?email=alguem%40example.com",
            },
            errorContext
        );

        expect(warn).toHaveBeenCalledWith(
            "[request] failed method=GET path=/pt-br/contact routeType=render"
        );
    });

    it("survives a value that is not an error at all", () => {
        expect(() =>
            onRequestError?.("just a string", errorRequest, errorContext)
        ).not.toThrow();
    });
});
