import { keys as email } from "@repo/email/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as security } from "@repo/security/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    extends: [core(), email(), security()],
    server: {
        // Post-sign-up onboarding. Empty or absent keeps it on; only "false" turns it off.
        ONBOARDING_ENABLED: z.string().optional(),
    },
    // Public Firebase and analytics settings the proxy needs to name the exact
    // third-party origins the browser is allowed to reach.
    client: {
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
        // Filled in, the browser talks to the Auth emulator and its origin is added to
        // the policy. Empty, everything points at the real Firebase, as before.
        NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
        // Doubles as the switch for the upload capability: absent means the form falls
        // back to the photo URL field and the bucket host stays out of the policy.
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
        NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
    },
    runtimeEnv: {
        ONBOARDING_ENABLED: process.env.ONBOARDING_ENABLED,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
            process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST:
            process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
            process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_GA_MEASUREMENT_ID:
            process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    },
});
