"use client";

import useAuth from "@repo/auth/provider";
import { UserRoleLevel } from "@repo/auth/types";
import type { User } from "firebase/auth";
import { useParams, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect } from "react";
import {
    deriveAuthRequestProps,
    mapMeTypeToProfileKind,
    type ProfileKind,
} from "@/shared/lib/authRequestHeaders";
import { apiClient } from "@/shared/lib/client";
import { withLocalePath } from "@/shared/lib/localePath";
import { usePanelStore } from "@/shared/stores/panelStore";

export type AuthRequestPanelContextValue = {
    profileKind: ProfileKind | null;
    panelRequestRole: UserRoleLevel;
    impersonatedFirebaseUid: string | null;
    impersonatedLabel: string | null;
    setPanelEnvironment: (role: UserRoleLevel) => void;
    setImpersonatedUser: (
        firebaseUid: string | null,
        label?: string | null
    ) => void;
};

/** Resolve `profileKind` from `/auth/me` and normalize panel state per role. */
async function hydrateProfileKind(
    user: User,
    isCancelled: () => boolean
): Promise<void> {
    const token = await user.getIdToken();
    if (!token || isCancelled()) {
        return;
    }
    apiClient.setAuthorizationHeader(token);

    try {
        const me = await apiClient.authApi.me();
        if (isCancelled()) {
            return;
        }
        const store = usePanelStore.getState();
        const kind = mapMeTypeToProfileKind(me.type);
        store.setProfileKind(kind);
        if (kind === "common") {
            store.setPanelRequestRole(UserRoleLevel.COMMON);
            store.setImpersonatedFirebaseUid(null);
        }
        store.markHydrated();
    } catch {
        // Keep the prior state; the next auth change will retry.
    }
}

/** Apply the SDK auth-request headers for the current session + panel state. */
function applyPanelHeaders(user: User): void {
    const state = usePanelStore.getState();
    if (!state.profileKind) {
        return;
    }
    // Avoid applying admin headers before the panel preference is known.
    if (state.profileKind === "admin" && !state.hydrated) {
        return;
    }
    const { props, context } = deriveAuthRequestProps({
        uid: user.uid,
        profileKind: state.profileKind,
        panelRole: state.panelRequestRole,
        impersonatedUid: state.impersonatedFirebaseUid,
    });
    if (context === "admin") {
        apiClient.changeToAdminContext();
    } else {
        apiClient.changeToCommonContext();
    }
    apiClient.setAuthRequestContext(props);
}

/**
 * Thin provider: state lives in `usePanelStore`, so this only re-renders when the
 * Firebase `user` changes — never on panel toggles. It hydrates `profileKind`
 * and applies the SDK headers via a store subscription (no re-render fanout).
 *
 * Note: routing admins to `/admin` is done server-side in the common layout
 * (loop-free), not here — a client redirect can ping-pong with the proxy.
 */
export function AuthRequestPanelProvider({
    children,
}: {
    readonly children: ReactNode;
}) {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            usePanelStore.getState().resetPanel();
            apiClient.clearAuthRequestContext();
            return;
        }
        let cancelled = false;
        hydrateProfileKind(user, () => cancelled);
        return () => {
            cancelled = true;
        };
    }, [user]);

    useEffect(() => {
        if (!user) {
            return;
        }
        const apply = () => applyPanelHeaders(user);
        apply();
        return usePanelStore.subscribe(apply);
    }, [user]);

    return <>{children}</>;
}

/**
 * Reads panel state from the store and wraps the env/impersonation actions with
 * navigation. Public API is unchanged from the previous Context implementation.
 */
export function useAuthRequestPanel(): AuthRequestPanelContextValue {
    const router = useRouter();
    const params = useParams();
    const locale = typeof params.locale === "string" ? params.locale : "pt-br";

    const profileKind = usePanelStore((s) => s.profileKind);
    const panelRequestRole = usePanelStore((s) => s.panelRequestRole);
    const impersonatedFirebaseUid = usePanelStore(
        (s) => s.impersonatedFirebaseUid
    );
    const impersonatedLabel = usePanelStore((s) => s.impersonatedLabel);
    const setPanelRequestRole = usePanelStore((s) => s.setPanelRequestRole);
    const setImpersonatedFirebaseUid = usePanelStore(
        (s) => s.setImpersonatedFirebaseUid
    );

    const setPanelEnvironment = useCallback(
        (role: UserRoleLevel) => {
            setPanelRequestRole(role);
            if (role === UserRoleLevel.ADMIN) {
                setImpersonatedFirebaseUid(null);
                router.push(withLocalePath(locale, "/admin"));
            } else {
                router.push(withLocalePath(locale, "/"));
            }
        },
        [locale, router, setPanelRequestRole, setImpersonatedFirebaseUid]
    );

    const setImpersonatedUser = useCallback(
        (firebaseUid: string | null, label?: string | null) => {
            setImpersonatedFirebaseUid(firebaseUid, label);
        },
        [setImpersonatedFirebaseUid]
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
