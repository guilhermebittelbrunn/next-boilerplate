/** biome-ignore-all lint/nursery/noShadow: form field names shadow outer scope */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import useAuth from "@repo/auth/provider";
import {
    HookFormInput,
    HookFormInputPassword,
} from "@repo/design-system/components/form/hookform";
import { Button } from "@repo/design-system/components/ui/button";
import { Form } from "@repo/design-system/components/ui/form";
import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import { postAuthRedirectTarget } from "@/shared/lib/auth-redirect";
import { signInWithGoogleViaApi } from "@/shared/lib/google-sign-in-api";
import { type SignUpFormValues, signUpSchema } from "../validations/signUp";

export const SignUpFormClient = () => {
    const router = useRouter();
    const { dictionary, locale } = getDictionary();
    const { errorAlert, successAlert } = useAlert();
    const { signUp, loading: authLoading, user } = useAuth();

    const googleSignIn = useMutation({
        mutationFn: signInWithGoogleViaApi,
        onError: (error) =>
            errorAlert(handleClientError(new FormattedError(error, locale))),
        onSuccess: () => {
            successAlert(dictionary.packages.auth.provider.onSuccess);
            const fallback = `/${locale}`;
            const raw =
                typeof window !== "undefined"
                    ? new URLSearchParams(window.location.search).get(
                          "redirect"
                      )
                    : null;
            router.push(postAuthRedirectTarget(raw, fallback));
        },
    });

    const form = useForm<SignUpFormValues>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    useEffect(() => {
        if (!authLoading && user) {
            router.push(`/${locale}`);
        }
    }, [user, authLoading, router, locale]);

    const onSubmit = (data: SignUpFormValues) => {
        signUp.mutate({
            email: data.email,
            password: data.password,
        });
    };

    // If user is already logged in, redirect (will redirect via useEffect)
    // But still show the form briefly to avoid flash
    if (user && !authLoading) {
        return null;
    }

    return (
        <div className="flex min-h-[calc(100vh-20rem)] items-center justify-center py-20">
            <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
                <div className="space-y-2 text-center">
                    <h1 className="font-bold text-3xl">
                        {dictionary.apps.app.pages.signUp.meta.title}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {dictionary.apps.app.pages.signUp.enterWithYourAccount}
                    </p>
                </div>

                <Form {...form}>
                    <form
                        className="space-y-4"
                        onSubmit={form.handleSubmit(onSubmit)}
                    >
                        <HookFormInput
                            label={dictionary.apps.app.pages.signUp.form.email}
                            name="email"
                            placeholder="seu@email.com"
                            type="email"
                        />

                        <HookFormInputPassword
                            label={
                                dictionary.apps.app.pages.signUp.form.password
                            }
                            name="password"
                            placeholder="••••••••"
                            type="password"
                        />

                        <HookFormInputPassword
                            label={
                                dictionary.apps.app.pages.signUp.form
                                    .confirmPassword
                            }
                            name="confirmPassword"
                            placeholder="••••••••"
                            type="password"
                        />

                        <Button
                            className="w-full"
                            disabled={
                                signUp.isPending || googleSignIn.isPending
                            }
                            type="submit"
                        >
                            {dictionary.apps.app.pages.signUp.form.submit}
                        </Button>
                    </form>
                </Form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            {dictionary.apps.app.pages.signUp.orContinueWith}
                        </span>
                    </div>
                </div>

                <Button
                    className="w-full"
                    disabled={signUp.isPending || googleSignIn.isPending}
                    loading={googleSignIn.isPending}
                    onClick={() => googleSignIn.mutate()}
                    type="button"
                    variant="outline"
                >
                    <FcGoogle />
                    {dictionary.apps.app.pages.signUp.googleSignIn}
                </Button>

                <div className="text-center text-sm">
                    <span className="text-muted-foreground">
                        {dictionary.apps.app.pages.signUp.noAccount}
                    </span>
                    <Link
                        className="text-primary hover:underline"
                        href={`/${locale}/sign-in`}
                    >
                        {dictionary.apps.app.pages.signUp.signIn}
                    </Link>
                </div>
            </div>
        </div>
    );
};
