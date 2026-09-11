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

export type PasswordResetRequestBody = {
    email: string;
    /** Language of the email. Absent falls back to the fork's default locale. */
    locale?: string;
};

export type PasswordResetConfirmBody = {
    oobCode: string;
    password: string;
};

export type EmailVerificationSendBody = {
    locale?: string;
};

export type EmailVerificationConfirmBody = {
    oobCode: string;
};

/**
 * Deliberately carries no information: a password reset request answers the same
 * way whether or not the address has an account.
 */
export type AuthActionRequested = { requested: true };

export type AuthActionConfirmed = { confirmed: true };

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

    async requestPasswordReset(
        body: PasswordResetRequestBody
    ): Promise<AuthActionRequested> {
        const { data } = await this.client.request<
            Response<AuthActionRequested>
        >({
            url: "/auth/password/reset-request",
            method: "POST",
            data: body,
        });

        return data.data;
    }

    async confirmPasswordReset(
        body: PasswordResetConfirmBody
    ): Promise<AuthActionConfirmed> {
        const { data } = await this.client.request<
            Response<AuthActionConfirmed>
        >({
            url: "/auth/password/reset",
            method: "POST",
            data: body,
        });

        return data.data;
    }

    async sendEmailVerification(
        body?: EmailVerificationSendBody
    ): Promise<AuthActionRequested> {
        const { data } = await this.client.request<
            Response<AuthActionRequested>
        >({
            url: "/auth/email-verification/send",
            method: "POST",
            data: body ?? {},
        });

        return data.data;
    }

    async confirmEmailVerification(
        body: EmailVerificationConfirmBody
    ): Promise<AuthActionConfirmed> {
        const { data } = await this.client.request<
            Response<AuthActionConfirmed>
        >({
            url: "/auth/email-verification/confirm",
            method: "POST",
            data: body,
        });

        return data.data;
    }
}
