"use client";

import {
    loginWithCustomToken,
    logout,
    signIn,
    signInWithGoogle,
    signUp,
    subscribeToIdTokenState,
} from "@repo/auth/client";
import useAlert from "@repo/design-system/hooks/useAlert";
import { useDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import {
    type UseMutationResult,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import type { User, UserCredential } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
    createContext,
    type ReactElement,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { postAuthRedirectTarget } from "./redirect";
import type { SignInDTO, SignUpDTO, UserDTO } from "./types";

type AuthContextType = {
    user: UserDTO | null;
    accessToken: string | null;
    loading: boolean;
    signIn: UseMutationResult<UserCredential, Error, SignInDTO>;
    signUp: UseMutationResult<UserCredential, Error, SignUpDTO, unknown>;
    signInWithGoogle: UseMutationResult<UserCredential, Error, void, unknown>;
    signOut: UseMutationResult<void, Error, void, unknown>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const UNAUTHORIZED_STATUS = 401;
const SESSION_EXPIRED_CODE = "AUTH_SESSION_EXPIRED";
const NO_SESSION_CODE = "AUTH_NO_SESSION";

type RefreshOutcome =
    | "refreshed"
    | "skipped"
    | "no-session"
    | "expired"
    | "error";

async function readErrorCode(response: Response): Promise<string | null> {
    try {
        const body = (await response.json()) as { error?: { code?: string } };
        return body.error?.code ?? null;
    } catch {
        return null;
    }
}

/**
 * Where to send the person back to after they sign in again. The expiry is often noticed
 * while already on the sign-in screen, where the proxy has put the real destination in
 * `?redirect=`: reading the pathname there would answer "sign-in" and drop it.
 */
function expiredSessionOrigin(signInPath: string): string | null {
    if (typeof window === "undefined") {
        return null;
    }
    const { pathname, search } = window.location;
    const carried = new URLSearchParams(search).get("redirect");
    const destination = carried
        ? postAuthRedirectTarget(carried, pathname)
        : pathname;
    return destination === signInPath ? null : destination;
}

/** Carries the API's `error.code` so the caller can tell a dead session from a hiccup. */
class SessionCookieRejectedError extends Error {
    readonly code: string | null;

    constructor(code: string | null, status: number) {
        super(`Session cookie rejected (${status})`);
        this.name = "SessionCookieRejectedError";
        this.code = code;
    }
}

export type AuthProviderProps = {
    children: ReactNode;
    /** Called on sign in/up/sign out errors. If not provided, errors are logged to console. */
    onError?: (error: unknown) => void;
    /** Return the path to redirect to after sign in/up (e.g. `/${locale}`). Defaults to "/". */
    getRedirectPath?: () => string;
    /**
     * When the URL has no safe `redirect` query, resolves the default post-login path
     * (e.g. admin home vs common home). Return `null` to use `getRedirectPath` fallback.
     */
    resolveDefaultPostLoginPath?: (args: {
        idToken: string;
        locale: string;
    }) => Promise<string | null>;
};

export function AuthProvider({
    children,
    getRedirectPath,
    resolveDefaultPostLoginPath,
}: AuthProviderProps): ReactElement {
    const { errorAlert, successAlert } = useAlert();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [user, setUser] = useState<UserDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    // Bootstrap-from-cookie is attempted at most once per mount (avoid loops).
    const bootstrapAttemptedRef = useRef(false);
    // Concurrent ID-token callbacks would otherwise each alert and each push to sign-in.
    const sessionExpiredHandledRef = useRef(false);
    const { dictionary, locale } = useDictionary();

    const redirectPath = () => getRedirectPath?.() ?? `/${locale}`;

    const resolvePostLoginPath = async (idToken: string) => {
        const fallback = redirectPath();
        if (typeof window === "undefined") {
            return fallback;
        }
        const raw = new URLSearchParams(window.location.search).get("redirect");
        if (raw) {
            return postAuthRedirectTarget(raw, fallback);
        }
        const resolved = await resolveDefaultPostLoginPath?.({
            idToken,
            locale,
        });
        return resolved ?? fallback;
    };

    const syncSessionCookie = useCallback(async (idToken: string | null) => {
        const base =
            typeof window !== "undefined" ? window.location.origin : "";
        if (idToken) {
            const res = await fetch(`${base}/api/auth/session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
                credentials: "include",
            });
            if (!res.ok) {
                throw new SessionCookieRejectedError(
                    await readErrorCode(res),
                    res.status
                );
            }
        } else {
            await fetch(`${base}/api/auth/session`, {
                method: "DELETE",
                credentials: "include",
            });
        }
    }, []);

    /**
     * Cross-app SSO: when this origin has no Firebase client session but a shared
     * session cookie exists, the server mints a custom token from it and we sign in
     * with it — so the client SDK gets a user and can emit ID tokens for the API.
     * Returns true when a session was adopted (onIdTokenChanged then re-fires).
     */
    const bootstrapFromSessionCookie =
        useCallback(async (): Promise<boolean> => {
            const base =
                typeof window !== "undefined" ? window.location.origin : "";
            try {
                const res = await fetch(`${base}/api/auth/custom-token`, {
                    method: "POST",
                    credentials: "include",
                });
                if (!res.ok) {
                    return false;
                }
                const data = (await res.json()) as { token?: string };
                if (!data.token) {
                    return false;
                }
                await loginWithCustomToken(data.token);
                return true;
            } catch {
                return false;
            }
        }, []);

    /**
     * Asks the server to slide the session cookie forward. The server throttles, so
     * calling it on every ID-token refresh costs a cheap `{ refreshed: false }` most
     * of the time. Only the absolute-lifetime refusal is actionable by the client.
     */
    const refreshSessionCookie = useCallback(
        async (idToken: string): Promise<RefreshOutcome> => {
            const base =
                typeof window !== "undefined" ? window.location.origin : "";
            try {
                const res = await fetch(`${base}/api/auth/session/refresh`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idToken }),
                    credentials: "include",
                });
                if (res.ok) {
                    const data = (await res.json()) as { refreshed?: boolean };
                    return data.refreshed ? "refreshed" : "skipped";
                }
                if (res.status !== UNAUTHORIZED_STATUS) {
                    return "error";
                }
                const code = await readErrorCode(res);
                if (code === SESSION_EXPIRED_CODE) {
                    return "expired";
                }
                return code === NO_SESSION_CODE ? "no-session" : "error";
            } catch {
                return "error";
            }
        },
        []
    );

    /** The server already cleared the shared cookie, so signing out locally is enough. */
    const handleSessionExpired = useCallback(async () => {
        if (sessionExpiredHandledRef.current) {
            return;
        }
        sessionExpiredHandledRef.current = true;
        await logout();
        setAccessToken(null);
        errorAlert(dictionary.packages.auth.provider.session.expired);
        const signInPath = `/${locale}/sign-in`;
        const destination = expiredSessionOrigin(signInPath);
        router.push(
            destination
                ? `${signInPath}?redirect=${encodeURIComponent(destination)}`
                : signInPath
        );
    }, [dictionary, errorAlert, locale, router]);

    /**
     * `useDictionary()` and `useAlert()` return fresh references on every render, so
     * `handleSessionExpired` changes identity on every render too. Reading it through a
     * ref keeps it out of the ID-token subscription's dependencies — otherwise the
     * subscription would be torn down and re-created on each render, re-running the
     * whole sign-in side effect every time.
     */
    const sessionExpiredRef = useRef(handleSessionExpired);
    useEffect(() => {
        sessionExpiredRef.current = handleSessionExpired;
    }, [handleSessionExpired]);

    const applySignedInUser = useCallback(
        async (firebaseUser: User) => {
            bootstrapAttemptedRef.current = true;
            try {
                const token = await firebaseUser.getIdToken();
                setAccessToken(token);
                const outcome = await refreshSessionCookie(token);
                if (outcome === "no-session") {
                    await syncSessionCookie(token);
                } else if (outcome === "expired") {
                    await sessionExpiredRef.current();
                } else {
                    sessionExpiredHandledRef.current = false;
                }
            } catch (error) {
                setAccessToken(null);
                // The cookie is gone and the absolute lifetime forbids minting a new
                // one: without signing the Firebase user out here, every screen still
                // sees a signed-in user and keeps bouncing off the proxy.
                if (
                    error instanceof SessionCookieRejectedError &&
                    error.code === SESSION_EXPIRED_CODE
                ) {
                    await sessionExpiredRef.current();
                }
            }
        },
        [syncSessionCookie, refreshSessionCookie]
    );

    /** Returns true when a shared session is being adopted (a re-fire is pending). */
    const adoptSharedSession = useCallback(async (): Promise<boolean> => {
        if (bootstrapAttemptedRef.current) {
            setAccessToken(null);
            return false;
        }
        bootstrapAttemptedRef.current = true;
        const adopted = await bootstrapFromSessionCookie();
        if (!adopted) {
            setAccessToken(null);
        }
        // Never clear the shared cookie here — only on explicit sign-out.
        return adopted;
    }, [bootstrapFromSessionCookie]);

    useEffect(() => {
        const unsubscribe = subscribeToIdTokenState((u) => {
            setUser(u);
            const run = async () => {
                if (u) {
                    await applySignedInUser(u);
                    setLoading(false);
                    return;
                }
                const adopting = await adoptSharedSession();
                if (!adopting) {
                    setLoading(false);
                }
            };
            run().catch(() => setLoading(false));
        });
        return () => unsubscribe();
    }, [applySignedInUser, adoptSharedSession]);

    /**
     * Session cookie must exist before navigating to locale home / admin — otherwise
     * the proxy sees no `access-token` and redirects back to sign-in.
     */
    const onAuthSuccess = async (credential: UserCredential) => {
        try {
            const token = await credential.user.getIdToken();
            setAccessToken(token);
            await syncSessionCookie(token);
            successAlert(dictionary.packages.auth.provider.onSuccess);
            router.push(await resolvePostLoginPath(token));
        } catch {
            errorAlert(
                handleClientError(
                    new FormattedError(
                        new Error("Could not establish session"),
                        locale
                    )
                )
            );
        }
    };

    const signInMutation = useMutation({
        mutationFn: signIn,
        onError: (error) =>
            errorAlert(handleClientError(new FormattedError(error, locale))),
        onSuccess: onAuthSuccess,
    });

    const signUpMutation = useMutation({
        mutationFn: signUp,
        onError: (error) =>
            errorAlert(handleClientError(new FormattedError(error, locale))),
        onSuccess: onAuthSuccess,
    });

    const signInWithGoogleMutation = useMutation({
        mutationFn: signInWithGoogle,
        onError: (error) =>
            errorAlert(handleClientError(new FormattedError(error, locale))),
        onSuccess: onAuthSuccess,
    });

    const signOutMutation = useMutation({
        mutationFn: logout,
        onError: (error) =>
            errorAlert(handleClientError(new FormattedError(error, locale))),
        onSuccess: async () => {
            await syncSessionCookie(null);
            // Drop every cached query: the next user signing in on this browser must not
            // see the previous one's data while a refetch is in flight.
            queryClient.clear();
            router.push(redirectPath());
        },
    });

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                accessToken,
                signIn: signInMutation,
                signUp: signUpMutation,
                signInWithGoogle: signInWithGoogleMutation,
                signOut: signOutMutation,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export default function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}
