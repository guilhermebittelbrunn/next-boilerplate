"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ANALYTICS_EVENT } from "@repo/analytics/events";
import { useAnalyticsEvent } from "@repo/analytics/events-context";
import { isNewAccount } from "@repo/auth/client";
import useAuth from "@repo/auth/provider";
import {
    HookFormInput,
    HookFormInputPassword,
} from "@repo/design-system/components/form/hookform";
import { Button } from "@repo/design-system/components/ui/button";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import type { UserCredential } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import { env } from "@/env";
import { apiClient } from "@/shared/lib/client";
import {
    buildSignInSchema,
    type SignInFormValues,
} from "../validations/signInSchema";

const TRAILING_SLASHES = /\/+$/;

export const SignInFormClient = () => {
    const router = useRouter();
    const { dictionary, locale } = getDictionary();
    const { signIn, signInWithGoogle, user, loading: authLoading } = useAuth();
    const signInStartedHereRef = useRef(false);
    const trackEvent = useAnalyticsEvent();

    const isLoading = signIn.isPending || signInWithGoogle.isPending;
    const forgotPasswordUrl = env.NEXT_PUBLIC_APP_URL
        ? `${env.NEXT_PUBLIC_APP_URL.replace(TRAILING_SLASHES, "")}/${locale}/forgot-password`
        : null;

    const schema = useMemo(() => buildSignInSchema(dictionary), [dictionary]);

    const form = useForm<SignInFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const handleSuccessSignIn = async (credentials: UserCredential) => {
        const accessToken = await credentials.user.getIdToken();

        if (accessToken) {
            apiClient.setAuthorizationHeader(accessToken);
        }
    };

    useEffect(() => {
        if (!user) {
            signInStartedHereRef.current = false;
        }
    }, [user]);

    // A sign-in started on this screen is navigated by the auth provider, which honours
    // `?redirect=`; only a visitor who arrives already signed in is sent home from here.
    useEffect(() => {
        if (!authLoading && user && !signInStartedHereRef.current) {
            router.push(`/${locale}`);
        }
    }, [user, authLoading, router, locale]);

    if (user && !authLoading) {
        return null;
    }

    return (
        <div className="flex min-h-[calc(100vh-20rem)] items-center justify-center px-4 py-20 md:px-2">
            <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
                <div className="space-y-2 text-center">
                    <h1 className="font-bold text-3xl">
                        {dictionary.apps.web.pages.signIn.meta.title}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {dictionary.apps.web.pages.signIn.enterWithYourAccount}
                    </p>
                </div>

                <Form {...form}>
                    <form
                        className="space-y-4"
                        noValidate
                        onSubmit={form.handleSubmit((data) => {
                            signInStartedHereRef.current = true;
                            signIn.mutate(
                                { ...data },
                                { onSuccess: handleSuccessSignIn }
                            );
                        })}
                    >
                        <HookFormInput
                            label={dictionary.apps.web.pages.signIn.form.email}
                            name="email"
                            placeholder={
                                dictionary.apps.web.pages.signIn.form
                                    .emailPlaceholder
                            }
                            type="email"
                        />

                        <HookFormInputPassword
                            label={
                                dictionary.apps.web.pages.signIn.form.password
                            }
                            name="password"
                            placeholder={
                                dictionary.apps.web.pages.signIn.form
                                    .passwordPlaceholder
                            }
                        />

                        <Button
                            className="w-full"
                            disabled={isLoading}
                            loading={isLoading}
                            type="submit"
                        >
                            {dictionary.apps.web.pages.signIn.form.submit}
                        </Button>
                    </form>
                </Form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            {dictionary.apps.web.pages.signIn.orContinueWith}
                        </span>
                    </div>
                </div>

                <Button
                    className="w-full"
                    disabled={isLoading}
                    onClick={() => {
                        signInStartedHereRef.current = true;
                        signInWithGoogle.mutate(undefined, {
                            onSuccess: (credential) => {
                                if (isNewAccount(credential)) {
                                    trackEvent(ANALYTICS_EVENT.signUp, {
                                        method: "google",
                                    });
                                }
                                return handleSuccessSignIn(credential);
                            },
                        });
                    }}
                    type="button"
                    variant="outline"
                >
                    <FcGoogle />
                    {dictionary.apps.web.pages.signIn.googleSignIn}
                </Button>

                <div className="space-y-2 text-center text-sm">
                    {forgotPasswordUrl ? (
                        <p>
                            <a
                                className="text-primary hover:underline"
                                href={forgotPasswordUrl}
                            >
                                {
                                    dictionary.apps.web.pages.signIn
                                        .forgotPassword
                                }
                            </a>
                        </p>
                    ) : null}
                    <p>
                        <span className="text-muted-foreground">
                            {dictionary.apps.web.pages.signIn.noAccount}
                        </span>
                        <Link
                            className="text-primary hover:underline"
                            href={`/${locale}/sign-up`}
                        >
                            {dictionary.apps.web.pages.signIn.signUp}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
