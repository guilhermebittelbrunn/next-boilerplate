import { keys as email } from "@repo/email/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as security } from "@repo/security/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    extends: [core(), email(), security()],
    server: {},
    // Public settings the proxy needs to name the exact origins the browser may
    // reach. Declared here rather than taken from the extended envs: with
    // `skipValidation` those are not merged into the resolved object.
    client: {
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
        // Filled in, the browser talks to the Auth emulator and its origin is added to
        // the policy. Empty, everything points at the real Firebase, as before.
        NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
        NEXT_PUBLIC_API_URL: z.string().optional(),
    },
    runtimeEnv: {
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
            process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST:
            process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    },
    skipValidation: true,
});
