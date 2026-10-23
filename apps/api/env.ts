import { keys as auth } from "@repo/auth/keys";
import { keys as email } from "@repo/email/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as payments } from "@repo/payments/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const STRIPE_LOOKUP_KEY_MAX_LENGTH = 80;

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
        // Redeclared even though `auth()` already provides it: `skipValidation` makes
        // createEnv answer with this module's own `runtimeEnv` and drop everything
        // inherited, which below is every development run — and the upload capability
        // would read as switched off on every local machine.
        FIREBASE_STORAGE_BUCKET: z.string().optional(),
        // "true" turns on sign-in by email link. Anything else, empty included, keeps it off.
        EMAIL_LINK_SIGN_IN_ENABLED: z.string().optional(),
    },
    // Base of the links the account action emails carry. Redeclared here even though
    // `core()` already provides it: `skipValidation` makes createEnv answer with this
    // module's own `runtimeEnv` and drop everything inherited, which below is every
    // development run — and a reset link that resolves to nothing is a dead feature.
    client: {
        NEXT_PUBLIC_APP_URL: z.url().optional(),
        // Lookup key of the provider feature that creating an entity demands while billing
        // is on. Must match the app's value.
        NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE: z
            .string()
            .max(STRIPE_LOOKUP_KEY_MAX_LENGTH)
            .optional(),
        // "true" turns on organization members and invitations. Anything else, empty
        // included, keeps the routes answering 404. Must match the app's value.
        NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED: z.string().optional(),
    },
    runtimeEnv: {
        FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
        FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        FIREBASE_STORAGE_BUCKET:
            process.env.FIREBASE_STORAGE_BUCKET ||
            process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
            undefined,
        EMAIL_LINK_SIGN_IN_ENABLED:
            process.env.EMAIL_LINK_SIGN_IN_ENABLED || undefined,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE:
            process.env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE || undefined,
        NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED:
            process.env.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED || undefined,
    },
    skipValidation: process.env.NODE_ENV === "development",
});
