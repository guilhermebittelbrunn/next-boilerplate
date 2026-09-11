import { keys as auth } from "@repo/auth/keys";
import { keys as email } from "@repo/email/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as payments } from "@repo/payments/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
    extends: [auth(), core(), email(), payments()],
    // Firestore is the API's database, reached with this service account. Unlike the
    // front-ends, the API cannot start in any useful state without it.
    server: {
        FIREBASE_ADMIN_PROJECT_ID: z.string().min(1),
        FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email(),
        FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1),
        // Comma-separated list of browser origins allowed to call this API.
        // Optional on purpose: this module is validated eagerly and is imported by
        // route handlers, so requiring it here would make every build — in any
        // environment — demand a production value. Production is guarded at boot,
        // in `instrumentation.ts`.
        CORS_ORIGIN: z.string().optional(),
    },
    // Base of the links the account action emails carry. Redeclared here even though
    // `core()` already provides it: `skipValidation` makes createEnv answer with this
    // module's own `runtimeEnv` and drop everything inherited, which below is every
    // development run — and a reset link that resolves to nothing is a dead feature.
    client: {
        NEXT_PUBLIC_APP_URL: z.url().optional(),
    },
    runtimeEnv: {
        FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
        FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    },
    skipValidation: process.env.NODE_ENV === "development",
});
