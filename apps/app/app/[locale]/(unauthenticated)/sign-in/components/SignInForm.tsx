"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ANALYTICS_EVENT } from "@repo/analytics/events";
import { useAnalyticsEvent } from "@repo/analytics/events-context";
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
import type { UserCredential } from "firebase/auth";
import Link from "next/link";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import { FullScreenLoader } from "@/shared/components/ui/FullScreenLoader";
import { useEmailLinkAvailability } from "@/shared/hooks/useEmailLinkSignIn";
import { useSignedInRedirect } from "@/shared/hooks/useSignedInRedirect";
import { withRedirectQuery } from "@/shared/lib/authRedirectLink";
import { apiClient } from "@/shared/lib/client";
import { signInWithGoogleViaApi } from "@/shared/lib/googleSignInApi";
import { resolveAppPostLoginPath } from "@/shared/lib/postLoginNavigation";
import {
    buildSignInSchema,
    type SignInFormValues,
} from "../validations/signInSchema";

type SignInFormProps = {
    redirect?: string | null;
};

export const SignInForm = ({ redirect = null }: SignInFormProps) => {
    const { dictionary, locale } = getDictionary();
    const { errorAlert, successAlert } = useAlert();
    const { signIn, user, loading: authLoading } = useAuth();
    const emailLinkAvailability = useEmailLinkAvailability();
    useSignedInRedirect();

    const trackEvent = useAnalyticsEvent();

    const googleSignIn = useMutation({
        mutationFn: () =>
            signInWithGoogleViaApi({
                onAccountCreated: () =>
                    trackEvent(ANALYTICS_EVENT.signUp, { method: "google" }),
            }),
        onError: (error) =>
            errorAlert(handleClientError(new FormattedError(error, locale))),
        onSuccess: async (result) => {
            successAlert(dictionary.packages.auth.provider.onSuccess);
            const path = await resolveAppPostLoginPath({
                idToken: result.session.idToken,
                locale,
                fallbackPath: `/${locale}`,
            });
            window.location.replace(path);
        },
    });

    const isLoading = signIn.isPending || googleSignIn.isPending;

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

    if (authLoading || user) {
        return <FullScreenLoader />;
    }

    return (
        <div className="flex min-h-[calc(100vh-20rem)] items-center justify-center px-4 py-20 sm:px-0">
            <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-sm">
                <div className="space-y-2 text-center">
                    <h1 className="font-bold text-3xl">
                        {dictionary.apps.app.pages.signIn.meta.title}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {dictionary.apps.app.pages.signIn.enterWithYourAccount}
                    </p>
                </div>

                <Form {...form}>
                    <form
                        className="space-y-4"
                        noValidate
                        onSubmit={form.handleSubmit((data) =>
                            signIn.mutate(
                                { ...data },
                                { onSuccess: handleSuccessSignIn }
                            )
                        )}
                    >
                        <HookFormInput
                            label={dictionary.apps.app.pages.signIn.form.email}
                            name="email"
                            placeholder={
                                dictionary.apps.app.pages.signIn.form
                                    .emailPlaceholder
                            }
                            type="email"
                        />

                        <HookFormInputPassword
                            label={
                                dictionary.apps.app.pages.signIn.form.password
                            }
                            name="password"
                            placeholder={
                                dictionary.apps.app.pages.signIn.form
                                    .passwordPlaceholder
                            }
                        />

                        <Button
                            className="w-full"
                            disabled={isLoading}
                            loading={isLoading}
                            type="submit"
                        >
                            {dictionary.apps.app.pages.signIn.form.submit}
                        </Button>
                    </form>
                </Form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            {dictionary.apps.app.pages.signIn.orContinueWith}
                        </span>
                    </div>
                </div>

                <Button
                    className="w-full"
                    disabled={isLoading}
                    loading={googleSignIn.isPending}
                    onClick={() => googleSignIn.mutate()}
                    type="button"
                    variant="outline"
                >
                    <FcGoogle />
                    {dictionary.apps.app.pages.signIn.googleSignIn}
                </Button>

                <div className="space-y-2 text-center text-sm">
                    <p>
                        <Link
                            className="text-primary hover:underline"
                            href={`/${locale}/forgot-password`}
                        >
                            {dictionary.apps.app.pages.signIn.forgotPassword}
                        </Link>
                    </p>
                    {emailLinkAvailability.data?.enabled ? (
                        <p>
                            <Link
                                className="text-primary hover:underline"
                                href={`/${locale}/sign-in/email-link`}
                            >
                                {dictionary.apps.app.pages.signIn.emailLink}
                            </Link>
                        </p>
                    ) : null}
                    <p>
                        <span className="text-muted-foreground">
                            {dictionary.apps.app.pages.signIn.noAccount}
                        </span>
                        <Link
                            className="text-primary hover:underline"
                            href={withRedirectQuery(
                                `/${locale}/sign-up`,
                                redirect
                            )}
                        >
                            {dictionary.apps.app.pages.signIn.signUp}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
