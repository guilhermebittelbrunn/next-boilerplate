"use client";

import { logout, signIn, signInWithGoogle, signUp } from "@repo/auth/client";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import type { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getDictionary } from "../internationalization/client";
import type { SignInDTO, SignUpDTO } from "./types";

type AuthContextType = {
    user: User | null;
    loading: boolean;
    signIn: UseMutationResult<void, Error, SignInDTO>;
    signUp: UseMutationResult<void, Error, SignUpDTO, unknown>;
    signInWithGoogle: () => void;
    signOut: () => void;
};

export function useAuth() {
    const { errorAlert } = useAlert();
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
        signIn: signInMutation,
        signUp: signUpMutation,
        signInWithGoogle: signInWithGoogleMutation,
        signOut: signOutMutation,
    };
}
