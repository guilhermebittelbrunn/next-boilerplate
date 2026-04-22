"use client";

import {
  logout,
  signIn,
  signInWithGoogle,
  signUp,
  subscribeToIdTokenState,
} from "@repo/auth/client";
import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import { locales } from "@repo/internationalization/utils";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import type { UserCredential } from "firebase/auth";
import { useRouter } from "next/navigation";
// biome-ignore lint/correctness/noUnusedImports: classic `jsx: "react"` needs React in scope
import React, {
  createContext,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { SignInDTO, SignUpDTO, UserDTO } from "./types";

/**
 * Uses the `redirect` query param set by the proxy (same-origin paths only).
 */
function postAuthRedirectTarget(
  rawRedirect: string | null,
  fallback: string
): string {
  if (!rawRedirect) {
    return fallback;
  }
  let path: string;
  try {
    path = decodeURIComponent(rawRedirect.trim());
  } catch {
    return fallback;
  }
  if (!(path.startsWith("/") && !path.startsWith("//"))) {
    return fallback;
  }
  if (path.includes("//")) {
    return fallback;
  }
  const isLocalePrefixed = locales.some(
    (l) => path === `/${l}` || path.startsWith(`/${l}/`)
  );
  return isLocalePrefixed ? path : fallback;
}

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
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { dictionary, locale } = getDictionary();

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
        throw new Error(`Session cookie rejected (${res.status})`);
      }
    } else {
      await fetch(`${base}/api/auth/session`, {
        method: "DELETE",
        credentials: "include",
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToIdTokenState((u) => {
      setUser(u);
      setLoading(false);
      const sync = async () => {
        if (u) {
          try {
            const token = await u.getIdToken();
            setAccessToken(token);
            await syncSessionCookie(token);
          } catch {
            setAccessToken(null);
          }
        } else {
          setAccessToken(null);
          await syncSessionCookie(null);
        }
      };
      sync().catch(() => {
        // Best-effort: Firebase user state is still correct if cookie sync fails.
      });
    });
    return () => unsubscribe();
  }, [syncSessionCookie]);

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
