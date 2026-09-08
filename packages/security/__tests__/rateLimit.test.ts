import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { arcjetMock, protectMock, slidingWindowMock, requestMock } = vi.hoisted(
    () => ({
        arcjetMock: vi.fn(),
        protectMock: vi.fn(),
        slidingWindowMock: vi.fn(),
        requestMock: vi.fn(),
    })
);

vi.mock("@arcjet/next", () => ({
    default: (...args: unknown[]) => arcjetMock(...args),
    detectBot: vi.fn(),
    shield: vi.fn(),
    slidingWindow: (...args: unknown[]) => slidingWindowMock(...args),
    request: (...args: unknown[]) => requestMock(...args),
}));

const ARCJET_KEY = "ajkey_test";
const RESET_SECONDS = 43;

function allowedDecision() {
    return { isDenied: () => false };
}

function rateLimitedDecision() {
    return {
        isDenied: () => true,
        reason: {
            isRateLimit: () => true,
            isBot: () => false,
            reset: RESET_SECONDS,
        },
    };
}

function botDecision() {
    return {
        isDenied: () => true,
        reason: { isRateLimit: () => false, isBot: () => true },
    };
}

async function loadLimiter(key: string | undefined) {
    if (key) {
        process.env.ARCJET_KEY = key;
    } else {
        Reflect.deleteProperty(process.env, "ARCJET_KEY");
    }

    vi.resetModules();
    return await import("../index");
}

const originalKey = process.env.ARCJET_KEY;

beforeEach(() => {
    arcjetMock.mockReset();
    protectMock.mockReset();
    slidingWindowMock.mockReset();
    requestMock.mockReset();
    arcjetMock.mockReturnValue({
        protect: (...args: unknown[]) => protectMock(...args),
    });
});

afterEach(() => {
    if (originalKey === undefined) {
        Reflect.deleteProperty(process.env, "ARCJET_KEY");
        return;
    }
    process.env.ARCJET_KEY = originalKey;
});

describe("rate limit without a key", () => {
    it("allows the request and says it is not enforcing anything", async () => {
        const { checkRateLimit } = await loadLimiter(undefined);

        await expect(
            checkRateLimit(new Request("http://api.test/"))
        ).resolves.toEqual({ allowed: true, enforced: false });
    });

    it("never reaches the network", async () => {
        const { checkRateLimit } = await loadLimiter(undefined);

        await checkRateLimit(new Request("http://api.test/"));

        expect(arcjetMock).not.toHaveBeenCalled();
        expect(protectMock).not.toHaveBeenCalled();
        expect(requestMock).not.toHaveBeenCalled();
    });

    it("reports the limiter as disabled", async () => {
        const { isRateLimitEnforced } = await loadLimiter(undefined);

        expect(isRateLimitEnforced()).toBe(false);
    });
});

describe("rate limit with a key", () => {
    it("counts requests per source address over a sliding window", async () => {
        const { checkRateLimit } = await loadLimiter(ARCJET_KEY);
        protectMock.mockResolvedValue(allowedDecision());

        await checkRateLimit(new Request("http://api.test/"));

        expect(arcjetMock).toHaveBeenCalledWith(
            expect.objectContaining({
                key: ARCJET_KEY,
                characteristics: ["ip.src"],
            })
        );
        expect(slidingWindowMock).toHaveBeenCalledWith(
            expect.objectContaining({ mode: "LIVE", interval: "60s" })
        );
    });

    it("lets a request within the budget through, enforcing", async () => {
        const { checkRateLimit, isRateLimitEnforced } =
            await loadLimiter(ARCJET_KEY);
        protectMock.mockResolvedValue(allowedDecision());

        await expect(
            checkRateLimit(new Request("http://api.test/"))
        ).resolves.toEqual({ allowed: true, enforced: true });
        expect(isRateLimitEnforced()).toBe(true);
    });

    it("carries the wait back to the caller when the budget is spent", async () => {
        const { checkRateLimit } = await loadLimiter(ARCJET_KEY);
        protectMock.mockResolvedValue(rateLimitedDecision());

        await expect(
            checkRateLimit(new Request("http://api.test/"))
        ).resolves.toEqual({
            allowed: false,
            reason: "rate-limit",
            retryAfterSeconds: RESET_SECONDS,
        });
    });

    it("has no wait to offer a refusal that is not about a budget", async () => {
        const { checkRateLimit } = await loadLimiter(ARCJET_KEY);
        protectMock.mockResolvedValue(botDecision());

        await expect(
            checkRateLimit(new Request("http://api.test/"))
        ).resolves.toEqual({
            allowed: false,
            reason: "bot",
            retryAfterSeconds: null,
        });
    });

    it("inspects the request it was handed instead of resolving another", async () => {
        const { checkRateLimit } = await loadLimiter(ARCJET_KEY);
        protectMock.mockResolvedValue(allowedDecision());
        const incoming = new Request("http://api.test/auth/sign-in");

        await checkRateLimit(incoming);

        expect(protectMock).toHaveBeenCalledWith(incoming);
        expect(requestMock).not.toHaveBeenCalled();
    });
});
