import "server-only";
import { z } from "zod";

const firebaseAuthKeysSchema = z.object({
    FIREBASE_ADMIN_PROJECT_ID: z.string().min(1).optional(),
    FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email().optional(),
    FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1).optional(),
    /** Web API key for Identity Toolkit REST (sign-in / sign-up). Falls back to NEXT_PUBLIC_FIREBASE_API_KEY. */
    FIREBASE_WEB_API_KEY: z.string().min(1).optional(),
});

/**
 * Server-side only keys for Firebase Admin
 * Client-side should use NEXT_PUBLIC_FIREBASE_* environment variables.
 * FIREBASE_ADMIN_PROJECT_ID can be omitted if NEXT_PUBLIC_FIREBASE_PROJECT_ID is set (same project).
 */
export const keys = () => {
    const env = {
        FIREBASE_ADMIN_PROJECT_ID:
            process.env.FIREBASE_ADMIN_PROJECT_ID ??
            process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
        FIREBASE_WEB_API_KEY:
            process.env.FIREBASE_WEB_API_KEY ??
            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    };

    // Only validate if at least one key is present
    if (
        !(
            env.FIREBASE_ADMIN_PROJECT_ID ||
            env.FIREBASE_ADMIN_CLIENT_EMAIL ||
            env.FIREBASE_ADMIN_PRIVATE_KEY
        )
    ) {
        return {
            FIREBASE_ADMIN_PROJECT_ID: undefined,
            FIREBASE_ADMIN_CLIENT_EMAIL: undefined,
            FIREBASE_ADMIN_PRIVATE_KEY: undefined,
            FIREBASE_WEB_API_KEY: env.FIREBASE_WEB_API_KEY,
        };
    }

    return firebaseAuthKeysSchema.parse(env);
};
