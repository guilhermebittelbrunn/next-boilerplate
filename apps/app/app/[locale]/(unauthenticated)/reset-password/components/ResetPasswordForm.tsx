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
import Link from "next/link";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { apiClient } from "@/shared/lib/client";
import { AuthCard } from "../../components/AuthCard";
import {
    buildResetPasswordSchema,
    type ResetPasswordFormValues,
} from "../validations/resetPasswordSchema";

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
        onError: (error) =>
            errorAlert(handleClientError(new FormattedError(error, locale))),
    });

    const signInLink = (
        <div className="text-center text-sm">
            <Link
                className="text-primary hover:underline"
                href={`/${locale}/sign-in`}
            >
                {resetPasswordCopy.goToSignIn}
            </Link>
        </div>
    );

    if (!oobCode) {
        return (
            <AuthCard
                description={resetPasswordCopy.invalidLink.description}
                title={resetPasswordCopy.invalidLink.title}
            >
                <div className="text-center text-sm">
                    <Link
                        className="text-primary hover:underline"
                        href={`/${locale}/forgot-password`}
                    >
                        {dictionary.apps.app.pages.signIn.forgotPassword}
                    </Link>
                </div>
            </AuthCard>
        );
    }

    if (confirmReset.isSuccess) {
        return (
            <AuthCard
                description={resetPasswordCopy.success.description}
                title={resetPasswordCopy.success.title}
            >
                {signInLink}
            </AuthCard>
        );
    }

    return (
        <AuthCard
            description={resetPasswordCopy.description}
            title={resetPasswordCopy.title}
        >
            <Form {...form}>
                <form
                    className="space-y-4"
                    onSubmit={form.handleSubmit((values) =>
                        confirmReset.mutate(values)
                    )}
                >
                    <HookFormInputPassword
                        label={resetPasswordCopy.form.password}
                        name="password"
                        placeholder={resetPasswordCopy.form.passwordPlaceholder}
                    />

                    <HookFormInputPassword
                        label={resetPasswordCopy.form.confirmPassword}
                        name="confirmPassword"
                        placeholder={resetPasswordCopy.form.passwordPlaceholder}
                    />

                    <Button
                        className="w-full"
                        disabled={confirmReset.isPending}
                        loading={confirmReset.isPending}
                        type="submit"
                    >
                        {resetPasswordCopy.form.submit}
                    </Button>
                </form>
            </Form>

            {signInLink}
        </AuthCard>
    );
}
