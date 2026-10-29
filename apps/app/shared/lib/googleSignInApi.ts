"use client";

import { getAuthClient } from "@repo/auth/client";
import { getDictionary } from "@repo/internationalization/client";
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    type UserCredential,
} from "firebase/auth";
import { apiClient } from "@/shared/lib/client";

export type GoogleApiSignInResult = {
    session: {
        idToken: string;
        refreshToken: string;
        expiresIn: string;
    };
    user: Record<string, unknown> | null;
};

/**
 * Google popup (Firebase client) → Google ID token → SDK `authApi.signInWithGoogle`
 * (same `session` + merged `user` as e-mail/password), then persists the Firebase
 * ID token cookie via the app's own session route.
 */
export async function signInWithGoogleViaApi(): Promise<GoogleApiSignInResult> {
    const auth = getAuthClient();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // The popup has already signed the Firebase client in. If the API turns the account
    // away, that client user has to go, or the screens keep treating it as signed in.
    try {
        return await exchangeForApiSession(result);
    } catch (error) {
        await signOut(auth).catch(() => null);
        throw error;
    }
}

async function exchangeForApiSession(
    result: UserCredential
): Promise<GoogleApiSignInResult> {
    const cred = GoogleAuthProvider.credentialFromResult(result);
    const googleIdToken = cred?.idToken;
    if (!googleIdToken) {
        throw new Error("Google sign-in did not return an ID token");
    }

    const requestUri =
        typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost";

    const { session, user } = await apiClient.authApi.signInWithGoogle({
        idToken: googleIdToken,
        requestUri,
    });

    if (!session?.idToken) {
        throw new Error("Invalid response from auth API");
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const sessionRes = await fetch(`${origin}/api/auth/session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: session.idToken }),
    }).catch(() => null);

    if (!sessionRes?.ok) {
        throw new Error(
            getDictionary().dictionary.packages.auth.provider.session
                .notEstablished
        );
    }

    apiClient.setAuthorizationHeader(session.idToken);

    return { session, user };
}
