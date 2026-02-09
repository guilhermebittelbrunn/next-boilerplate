import "server-only";
import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { type Auth, getAuth } from "firebase-admin/auth";
import { keys } from "./keys";

let firebaseAdminApp: App | undefined;
let firebaseAuth: Auth | undefined;

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

// Export auth instance (will throw if not configured)
export const auth = getAuthInstance();

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
