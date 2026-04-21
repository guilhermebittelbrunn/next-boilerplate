import "server-only";
import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { type Auth, getAuth } from "firebase-admin/auth";
import { type Firestore, getFirestore } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

const getFirebaseAdminApp = () => {
    if (firebaseAdminApp) {
        return firebaseAdminApp;
    }

    const adminKeys = keys();

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

/** Firebase Admin verifyIdToken failures that mean "no session", not a server bug */
const benignIdTokenVerifyCodes = new Set([
    "auth/argument-error",
    "auth/id-token-expired",
    "auth/invalid-id-token",
    "auth/session-cookie-revoked",
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
 * Get current user from request (cookies). Clerk-style API for server components.
 */
export async function currentUser(): Promise<CurrentUser | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("access-token")?.value ?? null;
        const userRecord = await getCurrentUser(token);
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
