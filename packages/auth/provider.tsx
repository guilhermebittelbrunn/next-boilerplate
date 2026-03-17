"use client";

import {
  getIdToken,
  logout,
  signIn,
  signInWithGoogle,
  signUp,
  subscribeToAuthState,
} from "@repo/auth/client";
import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import type { UserCredential } from "firebase/auth";
import { useRouter } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
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

const setSessionCookie = async (token: string) => {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  await fetch(`${base}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
};

export type AuthProviderProps = {
  children: ReactNode;
  /** Called on sign in/up/sign out errors. If not provided, errors are logged to console. */
  onError?: (error: unknown) => void;
  /** Return the path to redirect to after sign in/up (e.g. `/${locale}`). Defaults to "/". */
  getRedirectPath?: () => string;
};

export function AuthProvider({
  children,
  getRedirectPath,
}: AuthProviderProps): ReactElement {
  const { errorAlert, successAlert } = useAlert();
  const router = useRouter();
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { dictionary, locale } = getDictionary();

  const redirectPath = () => getRedirectPath?.() ?? `/${locale}`;

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const onSuccess = async () => {
    const token = await getIdToken();
    if (token) {
      await setSessionCookie(token);
      setAccessToken(token);
      successAlert(dictionary.packages.auth.provider.onSuccess);
    }
    router.push(redirectPath());
  };

  const signInMutation = useMutation({
    mutationFn: signIn,
    onError: (error) =>
      errorAlert(handleClientError(new FormattedError(error, locale))),
    onSuccess,
  });

  const signUpMutation = useMutation({
    mutationFn: signUp,
    onError: (error) =>
      errorAlert(handleClientError(new FormattedError(error, locale))),
    onSuccess,
  });

  const signInWithGoogleMutation = useMutation({
    mutationFn: signInWithGoogle,
    onError: (error) =>
      errorAlert(handleClientError(new FormattedError(error, locale))),
    onSuccess,
  });

  const clearSessionCookie = async () => {
    const base =
      typeof window !== "undefined" ? window.location.origin : "";
    await fetch(`${base}/api/auth/session`, { method: "DELETE" });
  };

  const signOutMutation = useMutation({
    mutationFn: logout,
    onError: (error) =>
      errorAlert(handleClientError(new FormattedError(error, locale))),
    onSuccess: async () => {
      await clearSessionCookie();
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
