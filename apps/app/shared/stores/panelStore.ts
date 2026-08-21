"use client";

import { UserRoleLevel } from "@repo/auth/types";
import { createContext, useContext } from "react";
import { createStore, useStore } from "zustand";
import {
    clearPanelCookies,
    clearPanelMirror,
    normalizePanelSnapshot,
    type PanelSnapshot,
    readPanelMirror,
    writePanelCookies,
    writePanelMirror,
} from "@/shared/lib/panelState";

export type PanelState = PanelSnapshot & {
    /** Display name of the impersonated user. Client-only; the server never knows it. */
    impersonatedLabel: string | null;
    /**
     * Whether the SDK currently carries a bearer token. Data hooks gate on it: a request
     * that goes out before the token is applied comes back 401, and React Query caches
     * that failure.
     */
    sdkAuthorized: boolean;
    /** Loads the display label from localStorage. Client-only, after mount. */
    hydrateLabelFromMirror: () => void;
    setSdkAuthorized: (authorized: boolean) => void;
    setPanelRequestRole: (role: UserRoleLevel) => void;
    setImpersonatedUser: (uid: string | null, label?: string | null) => void;
    resetPanel: () => void;
};

export type PanelStore = ReturnType<typeof createPanelStore>;

/**
 * Creates a panel store **per provider instance**, seeded with the snapshot the server
 * resolved from the session and the cookies.
 *
 * Deliberately not a module singleton: this store is read while rendering on the server,
 * and a process-wide instance would let one visitor's panel bleed into another's HTML
 * when two requests interleave. One store per request, one per browser tab.
 */
export function createPanelStore(snapshot: PanelSnapshot) {
    return createStore<PanelState>()((set, get) => ({
        ...snapshot,
        impersonatedLabel: null,
        sdkAuthorized: false,

        setSdkAuthorized: (authorized) => set({ sdkAuthorized: authorized }),

        hydrateLabelFromMirror: () => {
            const { impersonatedFirebaseUid, impersonatedLabel } = get();
            if (!impersonatedFirebaseUid || impersonatedLabel) {
                return;
            }
            const mirror = readPanelMirror();
            if (mirror?.impersonatedFirebaseUid === impersonatedFirebaseUid) {
                set({ impersonatedLabel: mirror.impersonatedLabel });
            }
        },

        setPanelRequestRole: (role) => {
            const next = normalizePanelSnapshot({
                profileKind: get().profileKind,
                panelRole: role,
                impersonatedUid: get().impersonatedFirebaseUid,
            });
            const label = next.impersonatedFirebaseUid
                ? get().impersonatedLabel
                : null;
            writePanelCookies(next);
            writePanelMirror({ ...next, impersonatedLabel: label });
            set({ ...next, impersonatedLabel: label });
        },

        setImpersonatedUser: (uid, label = null) => {
            const next = normalizePanelSnapshot({
                profileKind: get().profileKind,
                // Picking a target *is* the intent to act as them, so it implies the
                // common panel; clearing it returns to the admin panel. Deriving the role
                // from the current one would drop the target when switching admin →
                // common.
                panelRole: uid ? UserRoleLevel.COMMON : UserRoleLevel.ADMIN,
                impersonatedUid: uid,
            });
            const nextLabel = next.impersonatedFirebaseUid ? label : null;
            writePanelCookies(next);
            writePanelMirror({ ...next, impersonatedLabel: nextLabel });
            set({ ...next, impersonatedLabel: nextLabel });
        },

        // Sign-out: wipe state, cookies and storage so the panel never leaks into the
        // next user signing in on the same browser.
        resetPanel: () => {
            clearPanelCookies();
            clearPanelMirror();
            set({
                profileKind: null,
                panelRequestRole: UserRoleLevel.COMMON,
                impersonatedFirebaseUid: null,
                impersonatedLabel: null,
                sdkAuthorized: false,
            });
        },
    }));
}

export const PanelStoreContext = createContext<PanelStore | null>(null);

export function usePanelStoreApi(): PanelStore {
    const store = useContext(PanelStoreContext);
    if (!store) {
        throw new Error(
            "usePanelState must be used inside AuthRequestPanelProvider"
        );
    }
    return store;
}

export function usePanelState<T>(selector: (state: PanelState) => T): T {
    return useStore(usePanelStoreApi(), selector);
}
