"use client";

import useAuth from "@repo/auth/provider";
import { UserRoleLevel } from "@repo/auth/types";
import { resolveBrowserTimeZone } from "@repo/shared/utils/helpers/auth-request-headers";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
    deriveAuthRequestProps,
    type ProfileKind,
} from "@/shared/lib/authRequestHeaders";
import { apiClient } from "@/shared/lib/client";
import { withLocalePath } from "@/shared/lib/localePath";
import type { PanelSnapshot } from "@/shared/lib/panelState";
import {
    createPanelStore,
    type PanelStore,
    PanelStoreContext,
    usePanelState,
    usePanelStoreApi,
} from "@/shared/stores/panelStore";

export type AuthRequestPanelContextValue = {
    profileKind: ProfileKind | null;
    panelRequestRole: UserRoleLevel;
    impersonatedFirebaseUid: string | null;
    impersonatedLabel: string | null;
    /**
     * Switches the panel and navigates. Entering the common panel requires a target —
     * an admin has no common profile of their own, and the API rejects a COMMON request
     * without one.
     */
    setPanelEnvironment: (
        role: UserRoleLevel,
        target?: { uid: string; label: string | null }
    ) => void;
    setImpersonatedUser: (
        firebaseUid: string | null,
        label?: string | null
    ) => void;
};

export type InitialPanel = {
    /** Authoritative panel state resolved by the server (session + cookies). */
    snapshot: PanelSnapshot;
    /** Firebase uid of the authenticated actor, or null when anonymous. */
    actorUid: string | null;
};

/**
 * Applies every auth header the SDK needs: the bearer token and the request-context
 * `x-*` pair, in one pass.
 *
 * They are written together on purpose. Splitting the ownership between two components is
 * what used to break impersonation: the child applied the `x-*` during render, then the
 * parent's effect ran with the token still unresolved and cleared them, and nothing
 * re-applied them once the token arrived. One owner, one write.
 */
function applyAuthHeaders(
    store: PanelStore,
    actorUid: string,
    token: string | null
): void {
    // `apiClient` is a module singleton shared by the whole process. Writing a visitor's
    // identity into it while rendering on the server would leak that identity into other
    // concurrent requests, so headers are only ever applied in the browser. Server
    // Components talk to the API through their own per-request client.
    if (typeof window === "undefined") {
        return;
    }
    const state = store.getState();
    if (!state.profileKind) {
        return;
    }
    if (token) {
        apiClient.setAuthorizationHeader(token);
    }
    const { props, context } = deriveAuthRequestProps({
        uid: actorUid,
        profileKind: state.profileKind,
        panelRole: state.panelRequestRole,
        impersonatedUid: state.impersonatedFirebaseUid,
        timeZone: resolveBrowserTimeZone(),
    });
    if (context === "admin") {
        apiClient.changeToAdminContext();
    } else {
        apiClient.changeToCommonContext();
    }
    apiClient.setAuthRequestContext(props);
}

/**
 * Owns the per-request panel store and is the **single authority** over the SDK's auth
 * headers — bearer token included. Nothing else may write or clear them.
 *
 * The `x-*` pair is applied **synchronously on the first render**, before any child
 * mounts: a child's `useQuery` fires in its own effect, and React runs child effects
 * before the parent's, so applying them in an effect here would let the first request go
 * out with the wrong subject. The token can only arrive asynchronously, so `sdkAuthorized`
 * tells data hooks when it is safe to query.
 *
 * Headers are cleared only when the **server** reports no session (`actorUid === null`),
 * never while the token is merely still resolving.
 *
 * There is no client-side `/auth/me` round trip — `profileKind` comes from the snapshot,
 * which is what keeps the panel controls stable across a reload.
 *
 * Routing admins to `/admin` stays server-side in the layouts (loop-free); a client
 * redirect can ping-pong with the proxy.
 */
export function AuthRequestPanelProvider({
    initialPanel,
    children,
}: {
    readonly initialPanel: InitialPanel;
    readonly children: ReactNode;
}) {
    const { snapshot, actorUid } = initialPanel;
    const { accessToken } = useAuth();

    const [store] = useState(() => {
        const created = createPanelStore(snapshot);
        if (actorUid) {
            applyAuthHeaders(created, actorUid, accessToken);
        }
        return created;
    });

    useEffect(() => {
        if (!actorUid) {
            store.getState().resetPanel();
            apiClient.clearAuthRequestContext();
            apiClient.removeHeader("Authorization");
            return;
        }
        store.getState().hydrateLabelFromMirror();
        const apply = () => applyAuthHeaders(store, actorUid, accessToken);
        apply();
        // Written here and never from inside `apply`: `apply` runs as a store subscriber,
        // so writing state from it re-enters the notification it is handling and updates
        // get swallowed.
        store.getState().setSdkAuthorized(Boolean(accessToken));
        // Re-subscribing when the token refreshes is what keeps the panel subscription's
        // closure from applying a stale one.
        return store.subscribe(apply);
    }, [actorUid, accessToken, store]);

    return (
        <PanelStoreContext.Provider value={store}>
            {children}
        </PanelStoreContext.Provider>
    );
}

/**
 * Reads panel state from the store and wraps the env/impersonation actions with
 * navigation.
 *
 * Switching context calls `router.refresh()`, not a full page reload: the cookies are
 * already updated, so only the Server Components need to re-run — the bundle, the React
 * Query cache and the UI state all survive.
 */
export function useAuthRequestPanel(): AuthRequestPanelContextValue {
    const router = useRouter();
    const params = useParams();
    const locale = typeof params.locale === "string" ? params.locale : "pt-br";
    const store = usePanelStoreApi();
    const queryClient = useQueryClient();

    /**
     * Every cached query in the panel belongs to the subject that was active when it was
     * fetched, so switching subject invalidates all of it at once. Dropping the cache is
     * not an optimization — without it the previous user's rows stay on screen until a
     * manual refresh.
     *
     * Navigation is the caller's job: a `refresh` and a `push` fired in the same tick
     * cancel each other out, so whoever switches picks exactly one.
     */
    const switchSubject = useCallback(
        (apply: () => void) => {
            apply();
            // `resetQueries`, not `clear`: both discard the previous subject's data, but
            // only this one refetches the queries that are on screen. `clear` left the
            // table empty until the user pressed refresh by hand.
            queryClient.resetQueries();
        },
        [queryClient]
    );

    const profileKind = usePanelState((state) => state.profileKind);
    const panelRequestRole = usePanelState((state) => state.panelRequestRole);
    const impersonatedFirebaseUid = usePanelState(
        (state) => state.impersonatedFirebaseUid
    );
    const impersonatedLabel = usePanelState((state) => state.impersonatedLabel);

    const setPanelEnvironment = useCallback(
        (
            role: UserRoleLevel,
            target?: { uid: string; label: string | null }
        ) => {
            if (role === UserRoleLevel.COMMON && !target) {
                // No common user to act as — the mode is unreachable, so stay put
                // instead of navigating into an area every request would reject.
                return;
            }
            switchSubject(() => {
                if (target) {
                    store
                        .getState()
                        .setImpersonatedUser(target.uid, target.label);
                }
                // Set the target before the role: the store normalizes the pair, and
                // switching to ADMIN clears impersonation on its own.
                store.getState().setPanelRequestRole(role);
            });
            // The push already re-runs the Server Components for the new route, so no
            // refresh here.
            router.push(
                withLocalePath(
                    locale,
                    role === UserRoleLevel.ADMIN ? "/admin" : "/"
                )
            );
        },
        [locale, router, store, switchSubject]
    );

    const setImpersonatedUser = useCallback(
        (firebaseUid: string | null, label?: string | null) => {
            switchSubject(() =>
                store.getState().setImpersonatedUser(firebaseUid, label)
            );
            // Same route, new subject: only the Server Components need to re-run.
            router.refresh();
        },
        [router, store, switchSubject]
    );

    return {
        profileKind,
        panelRequestRole,
        impersonatedFirebaseUid,
        impersonatedLabel,
        setPanelEnvironment,
        setImpersonatedUser,
    };
}
