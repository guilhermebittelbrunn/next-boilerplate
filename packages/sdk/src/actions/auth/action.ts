import type BaseClient from "../../client/base";
import type { Response } from "../../client/type";

export type AuthMePayload = Record<string, unknown> & {
    uid: string;
    type?: string;
};

export type SignUpRequest = {
    email: string;
    password: string;
};

/** Carries no account data: the caller signs in right after with the same credentials. */
export type AuthAccountCreated = { created: true };

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

export type EmailChangeConfirmBody = {
    oobCode: string;
};

/**
 * Deliberately carries no information: a password reset request answers the same
 * way whether or not the address has an account.
 */
export type AuthActionRequested = { requested: true };

export type AuthActionConfirmed = { confirmed: true };

export type AuthSessionStanding = { active: true };

/**
 * The front-ends ask on the way to writing the session cookie and from their proxy, so a
 * slow API has to give up before it holds a page load hostage.
 */
const SESSION_STANDING_TIMEOUT_MS = 3000;

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

    async signUp(body: SignUpRequest): Promise<AuthAccountCreated> {
        const { data } = await this.client.request<
            Response<AuthAccountCreated>
        >({
            url: "/auth/sign-up",
            method: "POST",
            data: body,
        });

        return data.data;
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

    async confirmEmailChange(
        body: EmailChangeConfirmBody
    ): Promise<AuthActionConfirmed> {
        const { data } = await this.client.request<
            Response<AuthActionConfirmed>
        >({
            url: "/auth/email-change/confirm",
            method: "POST",
            data: body,
        });

        return data.data;
    }

    /** Answers 401 `AUTH_SESSION_REVOKED` for a session ended from another device. */
    async sessionStanding(): Promise<AuthSessionStanding> {
        const { data } = await this.client.request<
            Response<AuthSessionStanding>
        >({
            url: "/auth/session",
            method: "GET",
            timeout: SESSION_STANDING_TIMEOUT_MS,
        });

        return data.data;
    }

    async endSession(): Promise<void> {
        await this.client.request({
            url: "/auth/session",
            method: "DELETE",
            timeout: SESSION_STANDING_TIMEOUT_MS,
        });
    }
}
