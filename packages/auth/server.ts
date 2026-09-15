import "server-only";
import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import {
    type Auth,
    type DecodedIdToken,
    getAuth,
    type UserRecord,
} from "firebase-admin/auth";
import { type Firestore, getFirestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_PROJECT_ID, isEmulated } from "./emulator";
import { keys } from "./keys";

/** Clerk-style auth return type for compatibility */
export type AuthResult = {
    userId: string | null;
    orgId: string | null;
    redirectToSignIn: () => never;
};

/** Clerk-style current user for compatibility (Firebase UserRecord mapped) */
export type CurrentUser = {
    id: string;
    fullName: string | null;
    imageUrl: string | null;
    emailAddresses: { emailAddress: string }[];
};

let firebaseAdminApp: App | undefined;
let firebaseAuth: Auth | undefined;
let firebaseFirestore: Firestore | undefined;
let firebaseStorage: Storage | undefined;

const getFirebaseAdminApp = () => {
    if (firebaseAdminApp) {
        return firebaseAdminApp;
    }

    const adminKeys = keys();

    // The emulators authenticate nobody, so there is no service account to supply: a
    // `demo-` project id is the whole configuration. The Admin SDK then picks up
    // FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST from the environment
    // on its own, which is why no call site below changes.
    if (isEmulated()) {
        firebaseAdminApp =
            getApps()[0] ??
            initializeApp({
                projectId:
                    adminKeys.FIREBASE_ADMIN_PROJECT_ID ?? DEMO_PROJECT_ID,
            });
        return firebaseAdminApp;
    }

    // Only initialize if all required keys are present
    if (
        !(
            adminKeys.FIREBASE_ADMIN_PROJECT_ID &&
            adminKeys.FIREBASE_ADMIN_CLIENT_EMAIL &&
            adminKeys.FIREBASE_ADMIN_PRIVATE_KEY
        )
    ) {
        throw new Error(
            "Firebase Admin credentials are not configured. Please set FIREBASE_ADMIN_* environment variables."
        );
    }

    if (getApps().length === 0) {
        firebaseAdminApp = initializeApp({
            credential: cert({
                projectId: adminKeys.FIREBASE_ADMIN_PROJECT_ID,
                clientEmail: adminKeys.FIREBASE_ADMIN_CLIENT_EMAIL,
                privateKey: adminKeys.FIREBASE_ADMIN_PRIVATE_KEY.replace(
                    /\\n/g,
                    "\n"
                ),
            }),
        });
    } else {
        firebaseAdminApp = getApps()[0];
    }

    return firebaseAdminApp;
};

export const getAuthInstance = (): Auth => {
    if (firebaseAuth) {
        return firebaseAuth;
    }
    firebaseAuth = getAuth(getFirebaseAdminApp());
    return firebaseAuth;
};

export const getFirestoreAdmin = (): Firestore => {
    if (firebaseFirestore) {
        return firebaseFirestore;
    }
    firebaseFirestore = getFirestore(getFirebaseAdminApp());
    return firebaseFirestore;
};

/**
 * The admin app is initialised without a default bucket, so callers name the bucket
 * themselves: the front-ends import this module too and must not inherit one.
 */
export const getStorageAdmin = (): Storage => {
    if (firebaseStorage) {
        return firebaseStorage;
    }
    firebaseStorage = getStorage(getFirebaseAdminApp());
    return firebaseStorage;
};

/** Firebase Admin verifyIdToken failures that mean "no session", not a server bug */
const benignIdTokenVerifyCodes = new Set([
    "auth/argument-error",
    "auth/id-token-expired",
    "auth/invalid-id-token",
    "auth/user-disabled",
]);

/** verifySessionCookie failures that mean "no/expired session", not a server bug */
const benignSessionCookieCodes = new Set([
    "auth/argument-error",
    "auth/session-cookie-expired",
    "auth/session-cookie-revoked",
    "auth/invalid-session-cookie",
    "auth/user-disabled",
]);

function firebaseAuthErrorCode(error: unknown): string | null {
    if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "string"
    ) {
        return (error as { code: string }).code;
    }
    return null;
}

const MILLISECONDS_IN_A_SECOND = 1000;

/**
 * An ID token stays cryptographically valid until it expires (up to an hour), so revoking
 * a user's sessions only takes effect if the sign-in that minted the token is compared
 * against the revocation mark. The user record is already loaded here, so this costs no
 * extra round trip.
 */
function isMintedBeforeRevocation(
    decodedToken: DecodedIdToken,
    user: UserRecord
): boolean {
    if (!user.tokensValidAfterTime) {
        return false;
    }
    const validAfterSeconds =
        Date.parse(user.tokensValidAfterTime) / MILLISECONDS_IN_A_SECOND;
    return (
        Number.isFinite(validAfterSeconds) &&
        decodedToken.auth_time < validAfterSeconds
    );
}

/**
 * Get the current user from the request
 * @param token - Firebase ID token from the request
 * @returns User record or null
 */
export const getCurrentUser = async (token: string | null) => {
    if (!token) {
        return null;
    }

    try {
        const authInstance = getAuthInstance();
        const decodedToken = await authInstance.verifyIdToken(token);
        const user = await authInstance.getUser(decodedToken.uid);
        if (isMintedBeforeRevocation(decodedToken, user)) {
            return null;
        }
        return user;
    } catch (error) {
        const code = firebaseAuthErrorCode(error);
        if (code && benignIdTokenVerifyCodes.has(code)) {
            return null;
        }
        console.error("Error verifying token:", error);
        return null;
    }
};

/**
 * Get user by UID
 */
export const getUserById = async (uid: string) => {
    try {
        const authInstance = getAuthInstance();
        return await authInstance.getUser(uid);
    } catch (error) {
        console.error("Error getting user:", error);
        return null;
    }
};

/**
 * Create a custom token for a user
 */
export const createCustomToken = async (
    uid: string,
    additionalClaims?: object
) => {
    try {
        const authInstance = getAuthInstance();
        return await authInstance.createCustomToken(uid, additionalClaims);
    } catch (error) {
        console.error("Error creating custom token:", error);
        throw error;
    }
};

/**
 * Exchange a Firebase ID token for a long-lived session cookie (Admin SDK).
 * `expiresInMs` must be between 5 minutes and 2 weeks per Firebase.
 */
export const createSessionCookie = async (
    idToken: string,
    expiresInMs: number
): Promise<string> => {
    const authInstance = getAuthInstance();
    return await authInstance.createSessionCookie(idToken, {
        expiresIn: expiresInMs,
    });
};

/**
 * Resolve the user from a Firebase session cookie (the cross-app credential).
 * Verifies with `checkRevoked: true` so disabling/revoking a user takes effect.
 * Returns null on any benign "no session" reason.
 */
export const getUserFromSessionCookie = async (
    sessionCookie: string | null
) => {
    if (!sessionCookie) {
        return null;
    }

    try {
        const authInstance = getAuthInstance();
        const decoded = await authInstance.verifySessionCookie(
            sessionCookie,
            true
        );
        return await authInstance.getUser(decoded.uid);
    } catch (error) {
        const code = firebaseAuthErrorCode(error);
        if (code && benignSessionCookieCodes.has(code)) {
            return null;
        }
        console.error("Error verifying session cookie:", error);
        return null;
    }
};

/**
 * Revoke all refresh tokens for a user (sign-out propagation across origins:
 * other front-ends' next ID-token refresh fails and the session cookie is rejected).
 */
export const revokeUserSessions = async (uid: string): Promise<void> => {
    try {
        await getAuthInstance().revokeRefreshTokens(uid);
    } catch (error) {
        console.error("Error revoking user sessions:", error);
    }
};

/**
 * Get current user from request (cookies). Clerk-style API for server components.
 * The `access-token` cookie holds a Firebase session cookie (not a raw ID token).
 */
export async function currentUser(): Promise<CurrentUser | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("access-token")?.value ?? null;
        const userRecord = await getUserFromSessionCookie(token);
        if (!userRecord) {
            return null;
        }
        return {
            id: userRecord.uid,
            fullName: userRecord.displayName ?? null,
            imageUrl: userRecord.photoURL ?? null,
            emailAddresses: userRecord.email
                ? [{ emailAddress: userRecord.email }]
                : [],
        };
    } catch {
        return null;
    }
}

/**
 * Auth helper for server components. Clerk-style API.
 * Returns userId, orgId (null for Firebase), and redirectToSignIn.
 */
export async function auth(): Promise<AuthResult> {
    const user = await currentUser();
    return {
        userId: user?.id ?? null,
        orgId: null,
        redirectToSignIn: () => redirect("/sign-in"),
    };
}
