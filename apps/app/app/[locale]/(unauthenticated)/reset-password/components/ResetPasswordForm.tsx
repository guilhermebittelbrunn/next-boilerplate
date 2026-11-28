"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HookFormInputPassword } from "@repo/design-system/components/form/hookform";
import { Button } from "@repo/design-system/components/ui/button";
import { Form } from "@repo/design-system/components/ui/form";
import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation } from "@tanstack/react-query";
import { CircleCheckIcon, Link2OffIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { apiErrorCodeOf } from "@/shared/lib/apiErrorCode";
import { apiClient } from "@/shared/lib/client";
import { AuthActionLink } from "../../components/AuthActionLink";
import { AuthCard } from "../../components/AuthCard";
import { authTextLinkClassName } from "../../components/authLink";
import {
    buildResetPasswordSchema,
    type ResetPasswordFormValues,
} from "../validations/resetPasswordSchema";

const SESSIONS_NOT_REVOKED = "AUTH_SESSIONS_NOT_REVOKED";

type ResetPasswordFormProps = {
    readonly oobCode: string | null;
};

export function ResetPasswordForm({ oobCode }: ResetPasswordFormProps) {
    const { dictionary, locale } = getDictionary();
    const { errorAlert } = useAlert();
    const resetPasswordCopy = dictionary.apps.app.pages.resetPassword;

    const schema = useMemo(
        () => buildResetPasswordSchema(dictionary),
        [dictionary]
    );

    const form = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    const confirmReset = useMutation({
        mutationFn: (values: ResetPasswordFormValues) =>
            apiClient.authApi.confirmPasswordReset({
                oobCode: oobCode ?? "",
                password: values.password,
            }),
        onError: (error) => {
            if (apiErrorCodeOf(error) === SESSIONS_NOT_REVOKED) {
                return;
            }
            errorAlert(handleClientError(new FormattedError(error, locale)));
        },
    });

    const signInLink = (
        <AuthActionLink href={`/${locale}/sign-in`}>
            {resetPasswordCopy.goToSignIn}
        </AuthActionLink>
    );

    if (!oobCode) {
        return (
            <AuthCard
                description={resetPasswordCopy.invalidLink.description}
                icon={Link2OffIcon}
                title={resetPasswordCopy.invalidLink.title}
                tone="warning"
            >
                <AuthActionLink href={`/${locale}/forgot-password`}>
                    {dictionary.apps.app.pages.signIn.forgotPassword}
                </AuthActionLink>
            </AuthCard>
        );
    }

    // The new password is already saved and the link is spent; only ending the older
    // sessions failed, so the form must not invite a second submit.
    if (
        confirmReset.isError &&
        apiErrorCodeOf(confirmReset.error) === SESSIONS_NOT_REVOKED
    ) {
        return (
            <AuthCard
                description={handleClientError(
                    new FormattedError(confirmReset.error, locale)
                )}
                icon={TriangleAlertIcon}
                title={resetPasswordCopy.success.title}
                tone="warning"
            >
                {signInLink}
            </AuthCard>
        );
    }

    if (confirmReset.isSuccess) {
        return (
            <AuthCard
                description={resetPasswordCopy.success.description}
                icon={CircleCheckIcon}
                title={resetPasswordCopy.success.title}
                tone="success"
            >
                {signInLink}
            </AuthCard>
        );
    }

    return (
        <AuthCard
            description={resetPasswordCopy.description}
            footer={
                <Link
                    className={authTextLinkClassName}
                    href={`/${locale}/sign-in`}
                >
                    {resetPasswordCopy.goToSignIn}
                </Link>
            }
            title={resetPasswordCopy.title}
        >
            <Form {...form}>
                <form
                    className="flex flex-col gap-4"
                    noValidate
                    onSubmit={form.handleSubmit((values) =>
                        confirmReset.mutate(values)
                    )}
                >
                    <HookFormInputPassword
                        autoComplete="new-password"
                        label={resetPasswordCopy.form.password}
                        name="password"
                        placeholder={resetPasswordCopy.form.passwordPlaceholder}
                    />

                    <HookFormInputPassword
                        autoComplete="new-password"
                        label={resetPasswordCopy.form.confirmPassword}
                        name="confirmPassword"
                        placeholder={resetPasswordCopy.form.passwordPlaceholder}
                    />

                    <Button
                        className="mt-2 w-full"
                        disabled={confirmReset.isPending}
                        loading={confirmReset.isPending}
                        size="lg"
                        type="submit"
                    >
                        {resetPasswordCopy.form.submit}
                    </Button>
                </form>
            </Form>
        </AuthCard>
    );
}
