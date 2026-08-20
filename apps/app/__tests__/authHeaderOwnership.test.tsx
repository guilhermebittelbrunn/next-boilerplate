import { UserRoleLevel } from "@repo/auth/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authState, headers } = vi.hoisted(() => ({
    authState: { accessToken: null as string | null },
    headers: new Map<string, string>(),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => authState,
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        setAuthorizationHeader: (token: string) =>
            headers.set("Authorization", `Bearer ${token}`),
        setAuthRequestContext: (props: Record<string, string | undefined>) => {
            for (const [key, value] of Object.entries({
                [AUTH_REQUEST_HEADER.USER_ID]: props.userId,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: props.requestUserId,
                [AUTH_REQUEST_HEADER.USER_ROLE]: props.userRole,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: props.requestRole,
            })) {
                if (value) {
                    headers.set(key, value);
                }
            }
        },
        clearAuthRequestContext: () => {
            for (const key of Object.values(AUTH_REQUEST_HEADER)) {
                headers.delete(key);
            }
        },
        removeHeader: (key: string) => headers.delete(key),
        changeToAdminContext: vi.fn(),
        changeToCommonContext: vi.fn(),
    },
}));

// Renders the real composition: the layout that used to own the token wrapping the
// provider that owns the request context. Testing the provider alone would miss the
// interaction that broke impersonation.
const ClientLayout = (await import("@/app/[locale]/clientLayout")).default;

const IMPERSONATING = {
    snapshot: {
        profileKind: "admin" as const,
        panelRequestRole: UserRoleLevel.COMMON,
        impersonatedFirebaseUid: "target-1",
    },
    actorUid: "admin-1",
};

function contextHeaders() {
    return {
        actor: headers.get(AUTH_REQUEST_HEADER.USER_ID),
        subject: headers.get(AUTH_REQUEST_HEADER.REQUEST_USER_ID),
        panel: headers.get(AUTH_REQUEST_HEADER.REQUEST_ROLE),
        authorization: headers.get("Authorization"),
    };
}

/**
 * The provider is the single authority over the SDK's auth headers. Ownership used to be
 * split with the parent layout, which cleared the request context on the branch where the
 * token was not resolved yet — and React runs child effects before the parent's, so that
 * clear wiped what the provider had just applied. Impersonated requests then went out
 * with only a bearer token and the API resolved the admin as themselves: 403.
 */
describe("auth header ownership", () => {
    beforeEach(() => {
        headers.clear();
        authState.accessToken = null;
    });

    it("applies the request context before the token is known", () => {
        render(
            <ClientLayout initialPanel={IMPERSONATING}>
                <span>child</span>
            </ClientLayout>
        );

        const applied = contextHeaders();
        expect(applied.actor).toBe("admin-1");
        expect(applied.subject).toBe("target-1");
        expect(applied.panel).toBe(UserRoleLevel.COMMON);
        expect(applied.authorization).toBeUndefined();
    });

    it("keeps the request context once the token arrives", () => {
        const { rerender } = render(
            <ClientLayout initialPanel={IMPERSONATING}>
                <span>child</span>
            </ClientLayout>
        );

        authState.accessToken = "token-abc";
        rerender(
            <ClientLayout initialPanel={IMPERSONATING}>
                <span>child</span>
            </ClientLayout>
        );

        const applied = contextHeaders();
        expect(applied.authorization).toBe("Bearer token-abc");
        // The subject is what makes impersonation work: losing it here is the 403.
        expect(applied.subject).toBe("target-1");
        expect(applied.panel).toBe(UserRoleLevel.COMMON);
    });

    it("clears everything when the server reports no session", () => {
        authState.accessToken = "token-abc";
        render(
            <ClientLayout
                initialPanel={{
                    snapshot: {
                        profileKind: null,
                        panelRequestRole: UserRoleLevel.COMMON,
                        impersonatedFirebaseUid: null,
                    },
                    actorUid: null,
                }}
            >
                <span>child</span>
            </ClientLayout>
        );

        expect(contextHeaders()).toEqual({
            actor: undefined,
            subject: undefined,
            panel: undefined,
            authorization: undefined,
        });
    });

    it("sends a common user as themselves", () => {
        authState.accessToken = "token-abc";
        render(
            <ClientLayout
                initialPanel={{
                    snapshot: {
                        profileKind: "common",
                        panelRequestRole: UserRoleLevel.COMMON,
                        impersonatedFirebaseUid: null,
                    },
                    actorUid: "user-7",
                }}
            >
                <span>child</span>
            </ClientLayout>
        );

        const applied = contextHeaders();
        expect(applied.actor).toBe("user-7");
        expect(applied.subject).toBe("user-7");
        expect(applied.panel).toBe(UserRoleLevel.COMMON);
    });
});
