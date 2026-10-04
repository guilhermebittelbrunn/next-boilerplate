import type { SessionAuthority, SessionStanding } from "@repo/auth/types";
import { HTTP_STATUS } from "@repo/shared/utils";
import axios from "axios";
import type { Project } from "./base";
import { Client } from "./index";

export const SESSION_REVOKED_CODE = "AUTH_SESSION_REVOKED";

export function isSessionRevokedError(error: unknown): boolean {
    if (!axios.isAxiosError(error)) {
        return false;
    }
    const body = error.response?.data as
        | { error?: { code?: unknown } }
        | undefined;
    return (
        error.response?.status === HTTP_STATUS.UNAUTHORIZED &&
        body?.error?.code === SESSION_REVOKED_CODE
    );
}

/**
 * Server-side only: each call builds its own client, because the credential travels as a
 * default header and a shared instance would hand one person's session to another request.
 * The browser's user agent is forwarded so the session is described by the device that
 * signed in, not by the front-end server making the call.
 */
export function createSessionAuthority(
    url: string | undefined,
    project: Project
): SessionAuthority {
    const clientFor = (credential: string, userAgent: string | null) => {
        const client = new Client({
            url: url ?? "",
            project,
            context: "common",
        });
        client.setAuthorizationHeader(credential);
        if (userAgent) {
            client.setHeader("User-Agent", userAgent);
        }
        return client;
    };

    return {
        async check(credential, userAgent): Promise<SessionStanding> {
            if (!url) {
                return "unknown";
            }
            try {
                await clientFor(
                    credential,
                    userAgent
                ).authApi.sessionStanding();
                return "active";
            } catch (error) {
                return isSessionRevokedError(error) ? "revoked" : "unknown";
            }
        },
        async end(credential): Promise<void> {
            if (!url) {
                return;
            }
            await clientFor(credential, null)
                .authApi.endSession()
                .catch(() => null);
        },
    };
}
