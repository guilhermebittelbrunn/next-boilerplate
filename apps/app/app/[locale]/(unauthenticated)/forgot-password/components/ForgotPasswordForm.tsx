"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HookFormInput } from "@repo/design-system/components/form/hookform";
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
    buildForgotPasswordSchema,
    type ForgotPasswordFormValues,
} from "../validations/forgotPasswordSchema";

export function ForgotPasswordForm() {
    const { dictionary, locale } = getDictionary();
    const { errorAlert } = useAlert();
    const forgotPasswordCopy = dictionary.apps.app.pages.forgotPassword;

    const schema = useMemo(
        () => buildForgotPasswordSchema(dictionary),
        [dictionary]
    );

    const form = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { email: "" },
    });

    const requestReset = useMutation({
        mutationFn: (values: ForgotPasswordFormValues) =>
            apiClient.authApi.requestPasswordReset({
                email: values.email,
                locale,
            }),
        onError: (error) =>
            errorAlert(handleClientError(new FormattedError(error, locale))),
    });

    const backToSignIn = (
        <div className="text-center text-sm">
            <Link
                className="text-primary hover:underline"
                href={`/${locale}/sign-in`}
            >
                {forgotPasswordCopy.backToSignIn}
            </Link>
        </div>
    );

    // The same panel answers a known and an unknown address: whether the account
    // exists must not be observable from this screen.
    if (requestReset.isSuccess) {
        return (
            <AuthCard
                description={forgotPasswordCopy.sent.description}
                title={forgotPasswordCopy.sent.title}
            >
                {backToSignIn}
            </AuthCard>
        );
    }

    return (
        <AuthCard
            description={forgotPasswordCopy.description}
            title={forgotPasswordCopy.title}
        >
            <Form {...form}>
                <form
                    className="space-y-4"
                    onSubmit={form.handleSubmit((values) =>
                        requestReset.mutate(values)
                    )}
                >
                    <HookFormInput
                        label={forgotPasswordCopy.form.email}
                        name="email"
                        placeholder={forgotPasswordCopy.form.emailPlaceholder}
                        type="email"
                    />

                    <Button
                        className="w-full"
                        disabled={requestReset.isPending}
                        loading={requestReset.isPending}
                        type="submit"
                    >
                        {forgotPasswordCopy.form.submit}
                    </Button>
                </form>
            </Form>

            {backToSignIn}
        </AuthCard>
    );
}
