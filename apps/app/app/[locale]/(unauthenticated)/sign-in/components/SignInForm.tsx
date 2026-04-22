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
import type { UserCredential } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import { apiClient } from "@/shared/lib/client";
import { resolveAppPostLoginPath } from "@/shared/lib/postLoginNavigation";
import { signInWithGoogleViaApi } from "@/shared/lib/googleSignInApi";
import {
    type SignInFormValues,
    signInSchema,
} from "../validations/signInSchema";

export const SignInForm = () => {
    const { dictionary, locale } = getDictionary();
    const { errorAlert, successAlert } = useAlert();
    const router = useRouter();
    const { signIn, user, loading: authLoading } = useAuth();

    const googleSignIn = useMutation({
        mutationFn: signInWithGoogleViaApi,
        onError: (error) =>
            errorAlert(handleClientError(new FormattedError(error, locale))),
        onSuccess: async (result) => {
            successAlert(dictionary.packages.auth.provider.onSuccess);
            const path = await resolveAppPostLoginPath({
                idToken: result.session.idToken,
                locale,
                fallbackPath: `/${locale}`,
            });
            router.push(path);
        },
    });

    const isLoading = signIn.isPending || googleSignIn.isPending;

    const form = useForm<SignInFormValues>({
        resolver: zodResolver(signInSchema),
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

    if (user && !authLoading) {
        return null;
    }

    return (
        <div className="flex min-h-[calc(100vh-20rem)] items-center justify-center py-20">
            <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
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
                        onSubmit={form.handleSubmit((data) =>
                            signIn.mutate(
                                { ...data },
                                { onSuccess: handleSuccessSignIn }
                            )
                        )}
                    >
                        <HookFormInput
                            label="Email"
                            name="email"
                            placeholder="seu@email.com"
                            type="email"
                        />

                        <HookFormInputPassword
                            label={
                                dictionary.apps.app.pages.signIn.form.password
                            }
                            name="password"
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

                <div className="text-center text-sm">
                    <span className="text-muted-foreground">
                        {dictionary.apps.app.pages.signIn.noAccount}
                    </span>
                    <Link
                        className="text-primary hover:underline"
                        href={`/${locale}/sign-up`}
                    >
                        {dictionary.apps.app.pages.signIn.signUp}
                    </Link>
                </div>
            </div>
        </div>
    );
};
