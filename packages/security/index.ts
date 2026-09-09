import arcjet, {
    type ArcjetBotCategory,
    type ArcjetWellKnownBot,
    detectBot,
    request,
    shield,
    slidingWindow,
} from "@arcjet/next";
import { keys } from "./keys";

const arcjetKey = keys().ARCJET_KEY;

const RATE_LIMIT_INTERVAL = "60s";
/**
 * Deliberately generous: a person signing in makes a handful of attempts a minute,
 * while a whole office behind one NAT address shares this budget. It still starves
 * credential stuffing, which needs thousands. Tighten from evidence, not from fear.
 */
const RATE_LIMIT_MAX = 20;

export type RateLimitBlockReason = "rate-limit" | "bot" | "denied";

export type RateLimitResult =
    | { allowed: true; enforced: boolean }
    | {
          allowed: false;
          reason: RateLimitBlockReason;
          retryAfterSeconds: number | null;
      };

/** Whether a request budget is actually being counted, or the limiter is a no-op. */
export const isRateLimitEnforced = (): boolean => Boolean(arcjetKey);

/**
 * Counts requests per source address in a shared store. Answers with a decision
 * instead of throwing so the caller can turn a refusal into `429` plus the wait
 * the client should honour.
 */
export const checkRateLimit = async (
    sourceRequest?: Request
): Promise<RateLimitResult> => {
    if (!arcjetKey) {
        return { allowed: true, enforced: false };
    }

    const aj = arcjet({
        key: arcjetKey,
        characteristics: ["ip.src"],
        rules: [
            slidingWindow({
                mode: "LIVE",
                interval: RATE_LIMIT_INTERVAL,
                max: RATE_LIMIT_MAX,
            }),
        ],
    });

    const decision = await aj.protect(sourceRequest ?? (await request()));

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
