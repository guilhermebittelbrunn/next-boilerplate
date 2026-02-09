"use client";

import { logout, signIn, signInWithGoogle, signUp } from "@repo/auth/client";
import { useAuth as useAuthContext } from "@repo/auth/provider";
import { getDictionary } from "@repo/internationalization/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { handleClientError } from "../utils/helpers/handleClientError";
import useAlert from "./useAlert";

export function useAuth() {
    const { errorAlert } = useAlert();
    const { user, loading } = useAuthContext();
    const router = useRouter();
    const { locale } = getDictionary();

    const signInMutation = useMutation({
        mutationFn: signIn,
        onError: (error) => errorAlert(handleClientError(error)),
        onSuccess: () => router.push(`/${locale}`),
    });

    const signUpMutation = useMutation({
        mutationFn: signUp,
        onError: (error) => errorAlert(handleClientError(error)),
        onSuccess: () => router.push(`/${locale}`),
    });

    const signInWithGoogleMutation = useMutation({
        mutationFn: signInWithGoogle,
        onError: (error) => errorAlert(handleClientError(error)),
        onSuccess: () => router.push(`/${locale}`),
    });

    const signOutMutation = useMutation({
        mutationFn: logout,
        onError: (error) => errorAlert(handleClientError(error)),
        onSuccess: () => router.push(`/${locale}`),
    });

    return {
        user,
        authLoading: loading,
        signIn: signInMutation,
        signUp: signUpMutation,
        signInWithGoogle: signInWithGoogleMutation,
        signOut: signOutMutation,
    };
}
