import arcjet, {
    type ArcjetBotCategory,
    type ArcjetWellKnownBot,
    detectBot,
    request,
    shield,
    slidingWindow,
} from "@arcjet/next";
import { readArcjetKey } from "./keys";

const RATE_LIMIT_INTERVAL = "60s";
/**
 * Deliberately generous: a person signing in makes a handful of attempts a minute,
 * while a whole office behind one NAT address shares this budget. It still starves
 * credential stuffing, which needs thousands. Tighten from evidence, not from fear.
 */
const STRICT_RATE_LIMIT_MAX = 20;
/**
 * Counted per address and actor together, so one office behind a NAT address does not
 * share a single budget. Folds a person filling forms; stops a loop hammering writes.
 */
const STANDARD_RATE_LIMIT_MAX = 60;
const ANONYMOUS_SUBJECT = "anonymous";
/**
 * Logged on the Arcjet dashboard, never enforced: a false positive here refuses a
 * legitimate write, so a fork watches real traffic for a week before switching to LIVE.
 */
const API_SHIELD_MODE = "DRY_RUN";

/**
 * `strict` guards the endpoints that spend provider quota, send mail or charge money;
 * `standard` is the floor for every other write.
 */
export type RateLimitBudget = "strict" | "standard";

export type RateLimitOptions = {
    budget?: RateLimitBudget;
    /** Opaque per-actor key; ignored by the strict budget, which counts the address only. */
    subject?: string;
};

export type RateLimitBlockReason = "rate-limit" | "bot" | "denied";

export type RateLimitResult =
    | { allowed: true; enforced: boolean }
    | {
          allowed: false;
          reason: RateLimitBlockReason;
          retryAfterSeconds: number | null;
      };

/** Whether a request budget is actually being counted, or the limiter is a no-op. */
export const isRateLimitEnforced = (): boolean => Boolean(readArcjetKey());

type ProtectedRequest = Request | Awaited<ReturnType<typeof request>>;

const protectWithBudget = async (
    arcjetKey: string,
    req: ProtectedRequest,
    budget: RateLimitBudget,
    subject: string
) => {
    if (budget === "standard") {
        return await arcjet({
            key: arcjetKey,
            characteristics: ["ip.src", "subject"],
            rules: [
                shield({ mode: API_SHIELD_MODE }),
                slidingWindow({
                    mode: "LIVE",
                    interval: RATE_LIMIT_INTERVAL,
                    max: STANDARD_RATE_LIMIT_MAX,
                }),
            ],
        }).protect(req, { subject });
    }

    return await arcjet({
        key: arcjetKey,
        characteristics: ["ip.src"],
        rules: [
            shield({ mode: API_SHIELD_MODE }),
            slidingWindow({
                mode: "LIVE",
                interval: RATE_LIMIT_INTERVAL,
                max: STRICT_RATE_LIMIT_MAX,
            }),
        ],
    }).protect(req);
};

/**
 * Counts requests in a shared store, per source address (`strict`, the default) or per
 * address and actor (`standard`). Answers with a decision instead of throwing so the
 * caller can turn a refusal into `429` plus the wait the client should honour.
 */
export const checkRateLimit = async (
    sourceRequest?: Request,
    { budget = "strict", subject = ANONYMOUS_SUBJECT }: RateLimitOptions = {}
): Promise<RateLimitResult> => {
    const arcjetKey = readArcjetKey();
    if (!arcjetKey) {
        return { allowed: true, enforced: false };
    }

    const decision = await protectWithBudget(
        arcjetKey,
        sourceRequest ?? (await request()),
        budget,
        subject
    );

    if (!decision.isDenied()) {
        return { allowed: true, enforced: true };
    }

    const reason = decision.reason;

    if (reason.isRateLimit()) {
        return {
            allowed: false,
            reason: "rate-limit",
            retryAfterSeconds: reason.reset,
        };
    }

    return {
        allowed: false,
        reason: reason.isBot() ? "bot" : "denied",
        retryAfterSeconds: null,
    };
};

export const secure = async (
    allow: (ArcjetWellKnownBot | ArcjetBotCategory)[],
    sourceRequest?: Request
) => {
    const arcjetKey = readArcjetKey();
    if (!arcjetKey) {
        return;
    }

    const base = arcjet({
        // Get your site key from https://app.arcjet.com
        key: arcjetKey,
        // Identify the user by their IP address
        characteristics: ["ip.src"],
        rules: [
            // Protect against common attacks with Arcjet Shield
            shield({
                // Will block requests. Use "DRY_RUN" to log only
                mode: "LIVE",
            }),
            // Other rules are added in different routes
        ],
    });

    const req = sourceRequest ?? (await request());
    const aj = base.withRule(detectBot({ mode: "LIVE", allow }));
    const decision = await aj.protect(req);

    if (decision.isDenied()) {
        if (decision.reason.isBot()) {
            throw new Error("No bots allowed");
        }

        if (decision.reason.isRateLimit()) {
            throw new Error("Rate limit exceeded");
        }

        throw new Error("Access denied");
    }
};
