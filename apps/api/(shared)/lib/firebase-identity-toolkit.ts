import { keys } from "@repo/auth/keys";

const BASE = "https://identitytoolkit.googleapis.com/v1";

type ToolkitSuccess = {
    localId: string;
    idToken: string;
    refreshToken: string;
    expiresIn: string;
};

type ToolkitErrorBody = {
    error?: { message?: string; code?: number };
};

export class IdentityToolkitError extends Error {
    readonly code: number | undefined;

    constructor(message: string, code?: number) {
        super(message);
        this.name = "IdentityToolkitError";
        this.code = code;
    }
}

function getWebApiKey(): string {
    const k = keys().FIREBASE_WEB_API_KEY;
    if (!k) {
        throw new IdentityToolkitError(
            "FIREBASE_WEB_API_KEY or NEXT_PUBLIC_FIREBASE_API_KEY is not configured"
        );
    }
    return k;
}

async function parseToolkitResponse(res: Response): Promise<ToolkitSuccess> {
    const data = (await res.json()) as ToolkitSuccess & ToolkitErrorBody;
    if (!res.ok || data.error) {
        const msg = data.error?.message ?? "Authentication request failed";
        throw new IdentityToolkitError(msg, data.error?.code);
    }
    return data;
}

export async function identitySignUp(
    email: string,
    password: string
): Promise<ToolkitSuccess> {
    const key = getWebApiKey();
    const res = await fetch(`${BASE}/accounts:signUp?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
        }),
    });
    return parseToolkitResponse(res);
}

export async function identitySignInWithPassword(
    email: string,
    password: string
): Promise<ToolkitSuccess> {
    const key = getWebApiKey();
    const res = await fetch(`${BASE}/accounts:signInWithPassword?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
        }),
    });
    return parseToolkitResponse(res);
}

type IdpSuccess = ToolkitSuccess & {
    isNewUser?: boolean;
};

function parseIdpResponse(res: Response): Promise<IdpSuccess> {
    return (async () => {
        const data = (await res.json()) as Partial<IdpSuccess> &
            ToolkitErrorBody;
        if (!res.ok || data.error) {
            const msg = data.error?.message ?? "Google sign-in failed";
            throw new IdentityToolkitError(msg, data.error?.code);
        }
        if (
            !(
                data.localId &&
                data.idToken &&
                data.refreshToken &&
                data.expiresIn
            )
        ) {
            throw new IdentityToolkitError(
                "Invalid response from identity provider"
            );
        }
        return data as IdpSuccess;
    })();
}

/**
 * Completes Firebase Auth using a Google OAuth ID token (from the client popup),
 * same session shape as password sign-in.
 */
export async function identitySignInWithGoogleIdToken(
    googleIdToken: string,
    requestUri: string
): Promise<IdpSuccess> {
    const key = getWebApiKey();
    const postBody = `id_token=${encodeURIComponent(googleIdToken)}&providerId=google.com`;
    const res = await fetch(`${BASE}/accounts:signInWithIdp?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            postBody,
            requestUri,
            returnSecureToken: true,
            returnIdpCredential: true,
        }),
    });
    return parseIdpResponse(res);
}
