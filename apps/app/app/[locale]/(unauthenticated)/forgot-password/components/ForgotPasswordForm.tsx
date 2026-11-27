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
import { MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { apiClient } from "@/shared/lib/client";
import { AuthActionLink } from "../../components/AuthActionLink";
import { AuthCard } from "../../components/AuthCard";
import { authTextLinkClassName } from "../../components/authLink";
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

    const backToSignInHref = `/${locale}/sign-in`;

    // The same panel answers a known and an unknown address: whether the account
    // exists must not be observable from this screen.
    if (requestReset.isSuccess) {
        return (
            <AuthCard
                description={forgotPasswordCopy.sent.description}
                icon={MailCheckIcon}
                title={forgotPasswordCopy.sent.title}
            >
                <AuthActionLink href={backToSignInHref} variant="outline">
                    {forgotPasswordCopy.backToSignIn}
                </AuthActionLink>
            </AuthCard>
        );
    }

    return (
        <AuthCard
            description={forgotPasswordCopy.description}
            footer={
                <Link className={authTextLinkClassName} href={backToSignInHref}>
                    {forgotPasswordCopy.backToSignIn}
                </Link>
            }
            title={forgotPasswordCopy.title}
        >
            <Form {...form}>
                <form
                    className="flex flex-col gap-4"
                    noValidate
                    onSubmit={form.handleSubmit((values) =>
                        requestReset.mutate(values)
                    )}
                >
                    <HookFormInput
                        autoComplete="email"
                        label={forgotPasswordCopy.form.email}
                        name="email"
                        placeholder={forgotPasswordCopy.form.emailPlaceholder}
                        spellCheck={false}
                        type="email"
                    />

                    <Button
                        className="mt-2 w-full"
                        disabled={requestReset.isPending}
                        loading={requestReset.isPending}
                        size="lg"
                        type="submit"
                    >
                        {forgotPasswordCopy.form.submit}
                    </Button>
                </form>
            </Form>
        </AuthCard>
    );
}
