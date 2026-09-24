import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * `.env.example` publishes `STRIPE_*=""` as the way to switch billing off, and `optional()`
 * only accepts `undefined`, so an empty string is folded into absence here. Validation is
 * never skipped: a key with the wrong prefix (a publishable `pk_` pasted as the secret)
 * fails at boot instead of on the first charge.
 */
export const keys = () =>
    createEnv({
        server: {
            STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
            STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
        },
        runtimeEnv: {
            STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || undefined,
            STRIPE_WEBHOOK_SECRET:
                process.env.STRIPE_WEBHOOK_SECRET || undefined,
        },
    });
