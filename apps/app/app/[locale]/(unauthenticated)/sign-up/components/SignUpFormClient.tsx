/** biome-ignore-all lint/nursery/noShadow: form field names shadow outer scope */
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
import type { SignUpRequest } from "@repo/sdk/src/actions/auth/action";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation } from "@tanstack/react-query";
import type { UserCredential } from "firebase/auth";
import Link from "next/link";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import { FullScreenLoader } from "@/shared/components/ui/FullScreenLoader";
import { useSignedInRedirect } from "@/shared/hooks/useSignedInRedirect";
import { withRedirectQuery } from "@/shared/lib/authRedirectLink";
import { apiClient } from "@/shared/lib/client";
import { signInWithGoogleViaApi } from "@/shared/lib/googleSignInApi";
import { resolveAppPostLoginPath } from "@/shared/lib/postLoginNavigation";
import { AuthCard } from "../../components/AuthCard";
import { AuthDivider } from "../../components/AuthDivider";
import { authTextLinkClassName } from "../../components/authLink";
import {
    buildSignUpSchema,
    type SignUpFormValues,
} from "../validations/signUpSchema";

type SignUpFormClientProps = {
    redirect?: string | null;
};

export default function SignUpFormClient({
    redirect = null,
}: SignUpFormClientProps) {
    const { dictionary, locale } = getDictionary();
    const signUpCopy = dictionary.apps.app.pages.signUp;
    const { errorAlert, successAlert } = useAlert();
    const { signIn, loading: authLoading, user } = useAuth();

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

    const schema = useMemo(() => buildSignUpSchema(dictionary), [dictionary]);

    const form = useForm<SignUpFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    useSignedInRedirect();

    /**
     * Only accounts created with a password get here: signing in with Google brings an
     * address the provider already vouched for. Runs after the redirect has already been
     * ordered, and swallows its own failure: the account exists at this point and the
     * panel carries a notice with its own resend button, so a send that does not go
     * through must never turn a completed sign-up into an error.
     */
    const requestVerificationEmail = async (credential: UserCredential) => {
        try {
            const accessToken = await credential.user.getIdToken();
            apiClient.setAuthorizationHeader(accessToken);
            await apiClient.authApi.sendEmailVerification({ locale });
        } catch (error) {
            console.error("Could not request the verification email", error);
        }
    };

    const createAccount = useMutation({
        mutationFn: (credentials: SignUpRequest) =>
            apiClient.authApi.signUp(credentials),
        onError: (error) =>
            errorAlert(handleClientError(new FormattedError(error, locale))),
        onSuccess: (_created, credentials) => {
            trackEvent(ANALYTICS_EVENT.signUp, { method: "email" });
            signIn.mutate(credentials, { onSuccess: requestVerificationEmail });
        },
    });

    const isSubmitting =
        createAccount.isPending || signIn.isPending || googleSignIn.isPending;

    const onSubmit = (data: SignUpFormValues) => {
        createAccount.mutate({ email: data.email, password: data.password });
    };

    // Already authenticated or still resolving the session: show a loader and let
    // the effect redirect, instead of flashing the sign-up form.
    if (authLoading || user) {
        return <FullScreenLoader />;
    }

    return (
        <AuthCard
            description={signUpCopy.createYourAccount}
            footer={
                <p>
                    {signUpCopy.alreadyHaveAccount}
                    <Link
                        className={authTextLinkClassName}
                        href={withRedirectQuery(`/${locale}/sign-in`, redirect)}
                    >
                        {signUpCopy.signIn}
                    </Link>
                </p>
            }
            title={signUpCopy.meta.title}
        >
            <Form {...form}>
                <form
                    className="flex flex-col gap-4"
                    noValidate
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <HookFormInput
                        autoComplete="email"
                        label={signUpCopy.form.email}
                        name="email"
                        placeholder={signUpCopy.form.emailPlaceholder}
                        spellCheck={false}
                        type="email"
                    />

                    <HookFormInputPassword
                        autoComplete="new-password"
                        label={signUpCopy.form.password}
                        name="password"
                        placeholder={signUpCopy.form.passwordPlaceholder}
                        type="password"
                    />

                    <HookFormInputPassword
                        autoComplete="new-password"
                        label={signUpCopy.form.confirmPassword}
                        name="confirmPassword"
                        placeholder={signUpCopy.form.passwordPlaceholder}
                        type="password"
                    />

                    <Button
                        className="mt-2 w-full"
                        disabled={isSubmitting}
                        loading={createAccount.isPending || signIn.isPending}
                        size="lg"
                        type="submit"
                    >
                        {signUpCopy.form.submit}
                    </Button>
                </form>
            </Form>

            <AuthDivider label={signUpCopy.orContinueWith} />

            <Button
                className="w-full"
                disabled={isSubmitting}
                loading={googleSignIn.isPending}
                onClick={() => googleSignIn.mutate()}
                size="lg"
                type="button"
                variant="outline"
            >
                <FcGoogle aria-hidden className="size-5" />
                {signUpCopy.googleSignIn}
            </Button>
        </AuthCard>
    );
}
