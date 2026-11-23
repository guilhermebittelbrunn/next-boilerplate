import { afterEach, describe, expect, it, vi } from "vitest";

const ARCJET_KEY = "ajkey_test";

async function loadEnv(vars: Record<string, string | undefined>) {
    for (const [name, value] of Object.entries(vars)) {
        vi.stubEnv(name, value);
    }
    vi.resetModules();
    return (await import("@/env")).env;
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("web env and the Arcjet key", () => {
    it("hands the configured key to the proxy", async () => {
        const env = await loadEnv({ ARCJET_KEY });

        expect(env.ARCJET_KEY).toBe(ARCJET_KEY);
    });

    it.each([
        ["absent", undefined],
        ["empty, the way the example env ships it", ""],
        ["only whitespace", "   "],
    ])("loads without a key when it is %s", async (_label, value) => {
        const env = await loadEnv({ ARCJET_KEY: value });

        expect(env.ARCJET_KEY).toBeUndefined();
    });

    it("refuses a key without the Arcjet prefix instead of running unprotected", async () => {
        vi.spyOn(console, "error").mockImplementation(vi.fn());

        await expect(
            loadEnv({ ARCJET_KEY: "not-an-arcjet-key" })
        ).rejects.toThrow("Invalid environment variables");
    });
});

describe("web env public urls", () => {
    it.each(["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_DOCS_URL"] as const)(
        "reads an empty %s as absent",
        async (name) => {
            const env = await loadEnv({ [name]: "" });

            expect(env[name]).toBeUndefined();
        }
    );

    it("keeps a configured app url", async () => {
        const env = await loadEnv({
            NEXT_PUBLIC_APP_URL: "https://app.example.com",
        });

        expect(env.NEXT_PUBLIC_APP_URL).toBe("https://app.example.com");
    });
});
