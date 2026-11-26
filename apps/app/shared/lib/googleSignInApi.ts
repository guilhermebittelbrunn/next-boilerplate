"use client";

import { getAuthClient, isNewAccount } from "@repo/auth/client";
import { getDictionary } from "@repo/internationalization/client";
import type { AuthMePayload } from "@repo/sdk/src/actions/auth/action";
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
    user: AuthMePayload | null;
};

export type GoogleApiSignInOptions = {
    onAccountCreated?: () => void;
};

/**
 * Google popup (Firebase client) → Google ID token → SDK `authApi.signInWithGoogle`
 * (same `session` + merged `user` as e-mail/password), then persists the Firebase
 * ID token cookie via the app's own session route.
 */
export async function signInWithGoogleViaApi({
    onAccountCreated,
}: GoogleApiSignInOptions = {}): Promise<GoogleApiSignInResult> {
    const auth = getAuthClient();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // Reported here and not after the API exchange: the sign-in screens follow a
    // successful exchange with a full page load, which can drop an event sent after it.
    if (isNewAccount(result)) {
        onAccountCreated?.();
    }

    // The popup has already signed the Firebase client in. If the API turns the account
    // away, that client user has to go, or the screens keep treating it as signed in.
    try {
        return await exchangeForApiSession(result);
    } catch (error) {
        await signOut(auth).catch(() => null);
        throw error;
    }
}

function sessionNotEstablishedError(): Error {
    return new Error(
        getDictionary().dictionary.packages.auth.provider.session.notEstablished
    );
}

async function exchangeForApiSession(
    result: UserCredential
): Promise<GoogleApiSignInResult> {
    const cred = GoogleAuthProvider.credentialFromResult(result);
    const googleIdToken = cred?.idToken;
    if (!googleIdToken) {
        throw sessionNotEstablishedError();
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
        throw sessionNotEstablishedError();
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const sessionRes = await fetch(`${origin}/api/auth/session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: session.idToken }),
    }).catch(() => null);

    if (!sessionRes?.ok) {
        throw sessionNotEstablishedError();
    }

    apiClient.setAuthorizationHeader(session.idToken);

    return { session, user };
}
