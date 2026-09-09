import { keys as email } from "@repo/email/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as security } from "@repo/security/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    extends: [core(), email(), security()],
    server: {},
    // Public Firebase and analytics settings the proxy needs to name the exact
    // third-party origins the browser is allowed to reach.
    client: {
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
        NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
    },
    runtimeEnv: {
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
            process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_GA_MEASUREMENT_ID:
            process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    },
});
