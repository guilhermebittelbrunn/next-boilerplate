"use client";

import useAuth from "@repo/auth/provider";
import { type IAuthContextProps, UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import type { User } from "firebase/auth";
import { useParams, useRouter } from "next/navigation";
import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { apiClient } from "@/shared/lib/client";
import { withLocalePath } from "@/shared/lib/localePath";

const PANEL_STORAGE_KEY = "bp:panel-request-role";
const IMP_STORAGE_KEY = "bp:impersonate-firebase-uid";

export type ProfileKind = "admin" | "common";

export type AuthRequestPanelContextValue = {
    profileKind: ProfileKind | null;
    panelRequestRole: UserRoleLevel;
    impersonatedFirebaseUid: string | null;
    setPanelEnvironment: (role: UserRoleLevel) => void;
    setImpersonatedUser: (firebaseUid: string | null) => void;
};

const AuthRequestPanelContext =
    createContext<AuthRequestPanelContextValue | null>(null);

export function useAuthRequestPanel(): AuthRequestPanelContextValue {
    const ctx = useContext(AuthRequestPanelContext);
    if (!ctx) {
        throw new Error(
            "useAuthRequestPanel must be used within AuthRequestPanelProvider"
        );
    }
    return ctx;
}

function mapMeTypeToProfileKind(type?: string): ProfileKind {
    if (type === UserType.ADMIN || type === "admin") {
        return "admin";
    }
    return "common";
}

function readAdminPanelFromStorage(): UserRoleLevel {
    const stored = sessionStorage.getItem(PANEL_STORAGE_KEY);
    if (stored === UserRoleLevel.COMMON || stored === UserRoleLevel.ADMIN) {
        return stored;
    }
    return UserRoleLevel.ADMIN;
}

function readImpersonationFromStorage(): string | null {
    const stored = sessionStorage.getItem(IMP_STORAGE_KEY);
    return stored && stored.length > 0 ? stored : null;
}

type HydrationOutcome =
    | { status: "aborted" }
    | { status: "common" }
    | {
        status: "admin";
        panel: UserRoleLevel;
        impersonated: string | null;
    };

async function hydrateFromRemoteUser(user: User): Promise<HydrationOutcome> {
    const token = await user.getIdToken();
    if (!token) {
        return { status: "aborted" };
    }
    apiClient.setAuthorizationHeader(token);
    let me: { uid: string; type?: string };
    try {
        me = await apiClient.authApi.me();
    } catch {
        return { status: "aborted" };
    }
    if (mapMeTypeToProfileKind(me.type) === "common") {
        return { status: "common" };
    }
    return {
        status: "admin",
        panel: readAdminPanelFromStorage(),
        impersonated: readImpersonationFromStorage(),
    };
}

export function AuthRequestPanelProvider({
    children,
}: {
    readonly children: ReactNode;
}) {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const locale = typeof params.locale === "string" ? params.locale : "pt-br";

    const [profileKind, setProfileKind] = useState<ProfileKind | null>(null);
    const [panelRequestRole, setPanelRequestRoleState] =
        useState<UserRoleLevel>(UserRoleLevel.COMMON);
    const [impersonatedFirebaseUid, setImpersonatedFirebaseUidState] = useState<
        string | null
    >(null);
    const [hydratedPanel, setHydratedPanel] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (!user) {
                setProfileKind(null);
                setHydratedPanel(false);
                apiClient.clearAuthRequestContext();
                return;
            }
            const outcome = await hydrateFromRemoteUser(user);
            if (cancelled) {
                return;
            }
            if (outcome.status === "aborted") {
                return;
            }
            if (outcome.status === "common") {
                setProfileKind("common");
                setPanelRequestRoleState(UserRoleLevel.COMMON);
                setImpersonatedFirebaseUidState(null);
                setHydratedPanel(true);
                return;
            }
            setProfileKind("admin");
            setPanelRequestRoleState(outcome.panel);
            setImpersonatedFirebaseUidState(outcome.impersonated);
            setHydratedPanel(true);
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [user]);

    const applySdkHeaders = useCallback(() => {
        if (!(user && profileKind)) {
            apiClient.clearAuthRequestContext();
            return;
        }
        const uid = user.uid;
        let props: IAuthContextProps;
        if (profileKind === "common") {
            props = {
                userId: uid,
                requestUserId: uid,
                userRole: UserRoleLevel.COMMON,
                requestRole: UserRoleLevel.COMMON,
            };
            apiClient.changeToCommonContext();
        } else if (
            panelRequestRole === UserRoleLevel.COMMON &&
            impersonatedFirebaseUid
        ) {
            props = {
                userId: uid,
                requestUserId: impersonatedFirebaseUid,
                userRole: UserRoleLevel.ADMIN,
                requestRole: UserRoleLevel.COMMON,
            };
            apiClient.changeToCommonContext();
        } else {
            props = {
                userId: uid,
                requestUserId: uid,
                userRole: UserRoleLevel.ADMIN,
                requestRole: UserRoleLevel.ADMIN,
            };
            apiClient.changeToAdminContext();
        }
        apiClient.setAuthRequestContext(props);
    }, [user, profileKind, panelRequestRole, impersonatedFirebaseUid]);

    useEffect(() => {
        if (!(user && profileKind)) {
            return;
        }
        if (profileKind === "admin" && !hydratedPanel) {
            return;
        }
        applySdkHeaders();
    }, [user, profileKind, hydratedPanel, applySdkHeaders]);

    const setPanelEnvironment = useCallback(
        (role: UserRoleLevel) => {
            sessionStorage.setItem(PANEL_STORAGE_KEY, role);
            setPanelRequestRoleState(role);
            if (role === UserRoleLevel.ADMIN) {
                sessionStorage.removeItem(IMP_STORAGE_KEY);
                setImpersonatedFirebaseUidState(null);
                router.push(withLocalePath(locale, "/admin"));
            } else {
                router.push(withLocalePath(locale, "/"));
            }
        },
        [locale, router]
    );

    const setImpersonatedUser = useCallback((firebaseUid: string | null) => {
        if (firebaseUid) {
            sessionStorage.setItem(IMP_STORAGE_KEY, firebaseUid);
        } else {
            sessionStorage.removeItem(IMP_STORAGE_KEY);
        }
        setImpersonatedFirebaseUidState(firebaseUid);
    }, []);

    const value = useMemo(
        (): AuthRequestPanelContextValue => ({
            profileKind,
            panelRequestRole,
            impersonatedFirebaseUid,
            setPanelEnvironment,
            setImpersonatedUser,
        }),
        [
            profileKind,
            panelRequestRole,
            impersonatedFirebaseUid,
            setPanelEnvironment,
            setImpersonatedUser,
        ]
    );

    return (
        <AuthRequestPanelContext.Provider value={value}>
            {children}
        </AuthRequestPanelContext.Provider>
    );
}
