"use client";

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
    type Auth,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    getAuth,
    onAuthStateChanged,
    onIdTokenChanged,
    signInWithCustomToken,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    type User,
} from "firebase/auth";
import type { SignInDTO, SignUpDTO } from "./types";

let firebaseApp: FirebaseApp | undefined;
let firebaseAuth: Auth | undefined;

type FirebaseClientConfig = {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    measurementId?: string;
};

const ENV_NAME_BY_REQUIRED_CONFIG_KEY = {
    apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY",
    authDomain: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    appId: "NEXT_PUBLIC_FIREBASE_APP_ID",
} as const;

const MOCK_CONFIG = {
    apiKey: "mock",
    authDomain: "mock",
    projectId: "mock",
    appId: "mock",
};

const readClientConfig = (): FirebaseClientConfig => ({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
});

const listMissingEnvNames = (config: FirebaseClientConfig) =>
    Object.entries(ENV_NAME_BY_REQUIRED_CONFIG_KEY)
        .filter(([key]) => !config[key as keyof FirebaseClientConfig])
        .map(([, envName]) => envName);

const initializeOnce = (config: FirebaseClientConfig) => {
    firebaseApp = getApps()[0] ?? initializeApp(config);
    return firebaseApp;
};

const getFirebaseApp = () => {
    if (firebaseApp) {
        return firebaseApp;
    }

    const config = readClientConfig();
    const missing = listMissingEnvNames(config);
    const isDevelopment = process.env.NODE_ENV === "development";

    if (missing.length === 0) {
        return initializeOnce(config);
    }

    if (isDevelopment) {
        console.warn(
            `⚠️  Firebase client not fully configured. Missing: ${missing.join(", ")}\n` +
                "Please create a .env.local file with these variables."
        );
        return initializeOnce(MOCK_CONFIG);
    }

    throw new Error(
        "Missing Firebase client configuration. Please set NEXT_PUBLIC_FIREBASE_* environment variables."
    );
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
 * Create a new user with email and password.
 * `role` is not sent to Firebase client Auth; pass it to the session API after sign-up (see AuthProvider).
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
 * Bootstrap the client SDK session from a custom token (cross-app SSO): the
 * server mints it from the shared session cookie so this origin gets a Firebase
 * user and can emit ID tokens for API calls.
 */
export const loginWithCustomToken = (customToken: string) => {
    const auth = getAuthClient();
    return signInWithCustomToken(auth, customToken);
};

/**
 * Subscribe to auth state changes
 */
export const subscribeToAuthState = (callback: (user: User | null) => void) => {
    const auth = getAuthClient();
    return onAuthStateChanged(auth, callback);
};

/**
 * Fires on sign-in, sign-out, and when the ID token is refreshed — use to keep
 * the httpOnly session cookie in sync with Firebase.
 */
export const subscribeToIdTokenState = (
    callback: (user: User | null) => void
) => {
    const auth = getAuthClient();
    return onIdTokenChanged(auth, callback);
};

/**
 * Get current ID token (for setting session cookie via API)
 */
export const getIdToken = (forceRefresh?: boolean): Promise<string | null> => {
    const auth = getAuthClient();
    const user = auth.currentUser;

    if (!user) {
        return Promise.resolve(null);
    }
    return user.getIdToken(forceRefresh);
};
