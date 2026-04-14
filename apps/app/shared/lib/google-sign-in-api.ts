"use client";

import { getAuthClient } from "@repo/auth/client";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { apiClient } from "@/shared/lib/client";

function stripTrailingSlash(value: string): string {
    return value.endsWith("/") ? value.slice(0, -1) : value;
}

export type GoogleApiSignInResult = {
    session: {
        idToken: string;
        refreshToken: string;
        expiresIn: string;
    };
    user: Record<string, unknown> | null;
};

/**
 * Google popup (Firebase client) → Google ID token → API `/auth/sign-in/google` →
 * same `session` + merged `user` as e-mail/password, then persists the Firebase ID token cookie.
 */
export async function signInWithGoogleViaApi(): Promise<GoogleApiSignInResult> {
    const auth = getAuthClient();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const cred = GoogleAuthProvider.credentialFromResult(result);
    const googleIdToken = cred?.idToken;
    if (!googleIdToken) {
        throw new Error("Google sign-in did not return an ID token");
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL
        ? stripTrailingSlash(process.env.NEXT_PUBLIC_API_URL)
        : "";
    if (!apiBase) {
        throw new Error("NEXT_PUBLIC_API_URL is not configured");
    }

    const requestUri =
        typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost";

    const res = await fetch(`${apiBase}/auth/sign-in/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: googleIdToken, requestUri }),
    });

    const body = (await res.json()) as {
        error?: string;
        session?: GoogleApiSignInResult["session"];
        user?: GoogleApiSignInResult["user"];
    };

    if (!res.ok) {
        throw new Error(body.error ?? "Google sign-in failed");
    }

    if (!body.session?.idToken) {
        throw new Error("Invalid response from auth API");
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const sessionRes = await fetch(`${origin}/api/auth/session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: body.session.idToken }),
    });

    if (!sessionRes.ok) {
        throw new Error("Could not persist session");
    }

    apiClient.setAuthorizationHeader(body.session.idToken);

    return {
        session: body.session,
        user: body.user ?? null,
    };
}
