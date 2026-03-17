/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <explanation> */
"use client";

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
    type Auth,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    type User,
} from "firebase/auth";
import type { SignInDTO, SignUpDTO } from "./types";

let firebaseApp: FirebaseApp | undefined;
let firebaseAuth: Auth | undefined;

const getFirebaseApp = () => {
    if (firebaseApp) {
        return firebaseApp;
    }

    // Get config from environment variables (client-side safe)
    const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };

    // Debug: log missing variables in development
    if (process.env.NODE_ENV === "development") {
        const missing: string[] = [];

        if (!config.apiKey) {
            missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
        }
        if (!config.authDomain) {
            missing.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
        }
        if (!config.projectId) {
            missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
        }

        if (!config.appId) {
            missing.push("NEXT_PUBLIC_FIREBASE_APP_ID");
        }

        if (missing.length > 0) {
            console.warn(
                `⚠️  Firebase client not fully configured. Missing: ${missing.join(", ")}\n` +
                    "Please create a .env.local file in apps/web/ with these variables."
            );
        }
    }

    if (
        !(
            config.apiKey &&
            config.authDomain &&
            config.projectId &&
            config.appId
        )
    ) {
        // In development, allow running without Firebase config
        if (process.env.NODE_ENV === "development") {
            // Return a mock app to prevent errors
            if (getApps().length === 0) {
                firebaseApp = initializeApp({
                    apiKey: "mock",
                    authDomain: "mock",
                    projectId: "mock",
                    appId: "mock",
                });
            } else {
                firebaseApp = getApps()[0];
            }
            return firebaseApp;
        }
        throw new Error(
            "Missing Firebase client configuration. Please set NEXT_PUBLIC_FIREBASE_* environment variables."
        );
    }

    if (getApps().length === 0) {
        firebaseApp = initializeApp(config);
    } else {
        firebaseApp = getApps()[0];
    }

    return firebaseApp;
};

export const getAuthClient = () => {
    if (firebaseAuth) {
        return firebaseAuth;
    }

    firebaseAuth = getAuth(getFirebaseApp());
    return firebaseAuth;
};

// export const decodeToken = (token: string) => {
//     const auth = getAuthClient();
//     return auth;
// }

/**
 * Sign in with email and password
 */
export const signIn = ({ email, password }: SignInDTO) => {
    const auth = getAuthClient();
    return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Sign in with Google using popup
 */
export const signInWithGoogle = () => {
    const auth = getAuthClient();
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
};

/**
 * Create a new user with email and password
 */
export const signUp = ({ email, password }: SignUpDTO) => {
    const auth = getAuthClient();
    return createUserWithEmailAndPassword(auth, email, password);
};

/**
 * Sign out the current user
 */
export const logout = () => {
    const auth = getAuthClient();
    return signOut(auth);
};

/**
 * Subscribe to auth state changes
 */
export const subscribeToAuthState = (callback: (user: User | null) => void) => {
    const auth = getAuthClient();
    return onAuthStateChanged(auth, callback);
};

/**
 * Get current ID token (for setting session cookie via API)
 */
export const getIdToken = (): Promise<string | null> => {
    const auth = getAuthClient();
    const user = auth.currentUser;

    if (!user) {
        return Promise.resolve(null);
    }
    return user.getIdToken();
};
