import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { arcjetMock, protectMock, shieldMock, slidingWindowMock, requestMock } =
    vi.hoisted(() => ({
        arcjetMock: vi.fn(),
        protectMock: vi.fn(),
        shieldMock: vi.fn(),
        slidingWindowMock: vi.fn(),
        requestMock: vi.fn(),
    }));

vi.mock("@arcjet/next", () => ({
    default: (...args: unknown[]) => arcjetMock(...args),
    detectBot: vi.fn(),
    shield: (...args: unknown[]) => shieldMock(...args),
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
    shieldMock.mockReset();
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

describe("rate limit with a malformed key", () => {
    it("loads without throwing and lets the request through, not enforcing", async () => {
        const { checkRateLimit, isRateLimitEnforced } =
            await loadLimiter("invalida");

        await expect(
            checkRateLimit(new Request("http://api.test/"))
        ).resolves.toEqual({ allowed: true, enforced: false });
        expect(isRateLimitEnforced()).toBe(false);
        expect(arcjetMock).not.toHaveBeenCalled();
        expect(protectMock).not.toHaveBeenCalled();
        expect(requestMock).not.toHaveBeenCalled();
    });

    it("skips the bot check as well", async () => {
        const { secure } = await loadLimiter("invalida");

        await expect(
            secure([], new Request("http://app.test/"))
        ).resolves.toBeUndefined();
        expect(arcjetMock).not.toHaveBeenCalled();
    });
});

describe("rate limit key lookup", () => {
    it("reads the key on every call instead of once at import", async () => {
        const { isRateLimitEnforced } = await loadLimiter(undefined);
        expect(isRateLimitEnforced()).toBe(false);

        process.env.ARCJET_KEY = ARCJET_KEY;

        expect(isRateLimitEnforced()).toBe(true);
    });

    it("hands the trimmed key to Arcjet", async () => {
        const { checkRateLimit } = await loadLimiter(`  ${ARCJET_KEY}  `);
        protectMock.mockResolvedValue(allowedDecision());

        await checkRateLimit(new Request("http://api.test/"));

        expect(arcjetMock).toHaveBeenCalledWith(
            expect.objectContaining({ key: ARCJET_KEY })
        );
    });
});

describe("rate limit budgets", () => {
    it("counts the strict budget per address, 20 a minute, by default", async () => {
        const { checkRateLimit } = await loadLimiter(ARCJET_KEY);
        protectMock.mockResolvedValue(allowedDecision());
        const incoming = new Request("http://api.test/auth/sign-in");

        await checkRateLimit(incoming);

        expect(arcjetMock).toHaveBeenCalledWith(
            expect.objectContaining({ characteristics: ["ip.src"] })
        );
        expect(slidingWindowMock).toHaveBeenCalledWith({
            mode: "LIVE",
            interval: "60s",
            max: 20,
        });
        expect(protectMock).toHaveBeenCalledWith(incoming);
    });

    it("ignores the subject on the strict budget", async () => {
        const { checkRateLimit } = await loadLimiter(ARCJET_KEY);
        protectMock.mockResolvedValue(allowedDecision());
        const incoming = new Request("http://api.test/auth/sign-in");

        await checkRateLimit(incoming, { budget: "strict", subject: "abc" });

        expect(protectMock).toHaveBeenCalledWith(incoming);
    });

    it("counts the standard budget per address and actor, 60 a minute", async () => {
        const { checkRateLimit } = await loadLimiter(ARCJET_KEY);
        protectMock.mockResolvedValue(allowedDecision());
        const incoming = new Request("http://api.test/notifications/read-all");

        await checkRateLimit(incoming, {
            budget: "standard",
            subject: "hashed-subject",
        });

        expect(arcjetMock).toHaveBeenCalledWith(
            expect.objectContaining({
                key: ARCJET_KEY,
                characteristics: ["ip.src", "subject"],
            })
        );
        expect(slidingWindowMock).toHaveBeenCalledWith({
            mode: "LIVE",
            interval: "60s",
            max: 60,
        });
        expect(protectMock).toHaveBeenCalledWith(incoming, {
            subject: "hashed-subject",
        });
    });

    it("counts a request without an actor under the anonymous subject", async () => {
        const { checkRateLimit } = await loadLimiter(ARCJET_KEY);
        protectMock.mockResolvedValue(allowedDecision());
        const incoming = new Request("http://api.test/contact");

        await checkRateLimit(incoming, { budget: "standard" });

        expect(protectMock).toHaveBeenCalledWith(incoming, {
            subject: "anonymous",
        });
    });

    it("carries the wait back on the standard budget too", async () => {
        const { checkRateLimit } = await loadLimiter(ARCJET_KEY);
        protectMock.mockResolvedValue(rateLimitedDecision());

        await expect(
            checkRateLimit(new Request("http://api.test/entities"), {
                budget: "standard",
                subject: "hashed-subject",
            })
        ).resolves.toEqual({
            allowed: false,
            reason: "rate-limit",
            retryAfterSeconds: RESET_SECONDS,
        });
    });

    it.each([
        ["without a key", undefined],
        ["with an empty key", "   "],
        ["with a malformed key", "invalida"],
    ])("is a no-op for both budgets %s", async (_label, key) => {
        const { checkRateLimit } = await loadLimiter(key);

        for (const budget of ["strict", "standard"] as const) {
            await expect(
                checkRateLimit(new Request("http://api.test/entities"), {
                    budget,
                    subject: "hashed-subject",
                })
            ).resolves.toEqual({ allowed: true, enforced: false });
        }

        expect(arcjetMock).not.toHaveBeenCalled();
        expect(protectMock).not.toHaveBeenCalled();
        expect(requestMock).not.toHaveBeenCalled();
    });
});

describe("rate limit shield", () => {
    const SHIELD_RULE = { rule: "shield" };
    const WINDOW_RULE = { rule: "sliding-window" };

    it.each(["strict", "standard"] as const)(
        "only logs attack patterns on the %s budget, never refusing on them",
        async (budget) => {
            const { checkRateLimit } = await loadLimiter(ARCJET_KEY);
            protectMock.mockResolvedValue(allowedDecision());
            shieldMock.mockReturnValue(SHIELD_RULE);
            slidingWindowMock.mockReturnValue(WINDOW_RULE);

            await checkRateLimit(new Request("http://api.test/entities"), {
                budget,
                subject: "hashed-subject",
            });

            expect(shieldMock).toHaveBeenCalledTimes(1);
            expect(shieldMock).toHaveBeenCalledWith({ mode: "DRY_RUN" });
            expect(arcjetMock).toHaveBeenCalledWith(
                expect.objectContaining({ rules: [SHIELD_RULE, WINDOW_RULE] })
            );
        }
    );

    it("is not built at all without a key", async () => {
        const { checkRateLimit } = await loadLimiter(undefined);

        await checkRateLimit(new Request("http://api.test/entities"));

        expect(shieldMock).not.toHaveBeenCalled();
    });
});
