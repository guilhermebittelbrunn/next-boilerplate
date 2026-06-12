import type BaseClient from "../../client/base";
import type { Response } from "../../client/type";

export type AuthMePayload = Record<string, unknown> & {
    uid: string;
    type?: string;
};

export type GoogleSignInRequest = {
    idToken: string;
    requestUri: string;
};

export type GoogleSignInSession = {
    idToken: string;
    refreshToken: string;
    expiresIn: string;
};

export type GoogleSignInResponse = {
    session: GoogleSignInSession;
    user: Record<string, unknown> | null;
};

export default class AuthActions {
    private readonly client: BaseClient;

    constructor(client: BaseClient) {
        this.client = client;
    }

    async me(): Promise<AuthMePayload> {
        const { data } = await this.client.request<Response<AuthMePayload>>({
            url: "/auth/me",
            method: "GET",
        });

        return data.data as AuthMePayload;
    }

    /**
     * Google popup (Firebase client) → Google ID token → API `/auth/sign-in/google`,
     * returning the same `session` + merged `user` shape as e-mail/password sign-in.
     */
    async signInWithGoogle(
        body: GoogleSignInRequest
    ): Promise<GoogleSignInResponse> {
        const { data } = await this.client.request<GoogleSignInResponse>({
            url: "/auth/sign-in/google",
            method: "POST",
            data: body,
        });

        return data;
    }
}
