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
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation } from "@tanstack/react-query";
import type { UserCredential } from "firebase/auth";
import { MailIcon } from "lucide-react";
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
import { AuthActionLink } from "../../components/AuthActionLink";
import { AuthCard } from "../../components/AuthCard";
import { AuthDivider } from "../../components/AuthDivider";
import { authTextLinkClassName } from "../../components/authLink";
import {
    buildSignInSchema,
    type SignInFormValues,
} from "../validations/signInSchema";

type SignInFormProps = {
    redirect?: string | null;
};

export const SignInForm = ({ redirect = null }: SignInFormProps) => {
    const { dictionary, locale } = getDictionary();
    const signInCopy = dictionary.apps.app.pages.signIn;
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
        <AuthCard
            description={signInCopy.enterWithYourAccount}
            footer={
                <p>
                    {signInCopy.noAccount}
                    <Link
                        className={authTextLinkClassName}
                        href={withRedirectQuery(`/${locale}/sign-up`, redirect)}
                    >
                        {signInCopy.signUp}
                    </Link>
                </p>
            }
            title={signInCopy.meta.title}
        >
            <Form {...form}>
                <form
                    className="flex flex-col gap-4"
                    noValidate
                    onSubmit={form.handleSubmit((data) =>
                        signIn.mutate(
                            { ...data },
                            { onSuccess: handleSuccessSignIn }
                        )
                    )}
                >
                    <HookFormInput
                        autoComplete="email"
                        label={signInCopy.form.email}
                        name="email"
                        placeholder={signInCopy.form.emailPlaceholder}
                        spellCheck={false}
                        type="email"
                    />

                    <div className="flex flex-col gap-2">
                        <HookFormInputPassword
                            autoComplete="current-password"
                            label={signInCopy.form.password}
                            name="password"
                            placeholder={signInCopy.form.passwordPlaceholder}
                        />
                        <Link
                            className={cn(
                                authTextLinkClassName,
                                "self-end text-sm"
                            )}
                            href={`/${locale}/forgot-password`}
                        >
                            {signInCopy.forgotPassword}
                        </Link>
                    </div>

                    <Button
                        className="mt-2 w-full"
                        disabled={isLoading}
                        loading={isLoading}
                        size="lg"
                        type="submit"
                    >
                        {signInCopy.form.submit}
                    </Button>
                </form>
            </Form>

            <AuthDivider label={signInCopy.orContinueWith} />

            <div className="flex flex-col gap-2">
                <Button
                    className="w-full"
                    disabled={isLoading}
                    loading={googleSignIn.isPending}
                    onClick={() => googleSignIn.mutate()}
                    size="lg"
                    type="button"
                    variant="outline"
                >
                    <FcGoogle aria-hidden className="size-5" />
                    {signInCopy.googleSignIn}
                </Button>
                {emailLinkAvailability.data?.enabled ? (
                    <AuthActionLink
                        href={`/${locale}/sign-in/email-link`}
                        variant="outline"
                    >
                        <MailIcon aria-hidden className="size-4" />
                        {signInCopy.emailLink}
                    </AuthActionLink>
                ) : null}
            </div>
        </AuthCard>
    );
};
