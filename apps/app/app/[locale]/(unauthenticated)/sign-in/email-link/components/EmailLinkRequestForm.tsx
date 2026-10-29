"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { HookFormInput } from "@repo/design-system/components/form/hookform";
import { Button } from "@repo/design-system/components/ui/button";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import Link from "next/link";
import { useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { FullScreenLoader } from "@/shared/components/ui/FullScreenLoader";
import {
    useEmailLinkAvailability,
    useEmailLinkRequest,
} from "@/shared/hooks/useEmailLinkSignIn";
import { AuthCard } from "../../../components/AuthCard";
import {
    buildEmailLinkSchema,
    type EmailLinkFormValues,
} from "../validations/emailLinkSchema";

export function EmailLinkRequestForm() {
    const { dictionary, locale } = getDictionary();
    const emailLinkCopy = dictionary.apps.app.pages.emailLinkSignIn;
    const requestCopy = emailLinkCopy.request;
    const availability = useEmailLinkAvailability();
    const requestLink = useEmailLinkRequest();
    const requestInFlightRef = useRef(false);

    const schema = useMemo(
        () => buildEmailLinkSchema(dictionary),
        [dictionary]
    );

    const form = useForm<EmailLinkFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { email: "" },
    });

    // Two clicks inside the same task both pass validation before the pending state
    // reaches the button, and each would send an email.
    const submitRequest = (values: EmailLinkFormValues) => {
        if (requestInFlightRef.current) {
            return;
        }
        requestInFlightRef.current = true;
        requestLink.mutate(values.email, {
            onSettled: () => {
                requestInFlightRef.current = false;
            },
        });
    };

    const backToSignIn = (
        <div className="text-center text-sm">
            <Link
                className="text-primary hover:underline"
                href={`/${locale}/sign-in`}
            >
                {emailLinkCopy.backToSignIn}
            </Link>
        </div>
    );

    if (availability.isPending) {
        return <FullScreenLoader />;
    }

    if (availability.data?.enabled !== true) {
        return (
            <AuthCard
                description={requestCopy.unavailable.description}
                title={requestCopy.unavailable.title}
            >
                {backToSignIn}
            </AuthCard>
        );
    }

    // The same panel answers every address: whether an account exists, or can receive a
    // link, must not be observable from this screen.
    if (requestLink.isSuccess) {
        return (
            <AuthCard
                description={requestCopy.sent.description}
                title={requestCopy.sent.title}
            >
                {backToSignIn}
            </AuthCard>
        );
    }

    return (
        <AuthCard
            description={requestCopy.description}
            title={requestCopy.title}
        >
            <Form {...form}>
                <form
                    className="space-y-4"
                    noValidate
                    onSubmit={form.handleSubmit(submitRequest)}
                >
                    <HookFormInput
                        label={requestCopy.form.email}
                        name="email"
                        placeholder={requestCopy.form.emailPlaceholder}
                        type="email"
                    />

                    <Button
                        className="w-full"
                        disabled={requestLink.isPending}
                        loading={requestLink.isPending}
                        type="submit"
                    >
                        {requestCopy.form.submit}
                    </Button>
                </form>
            </Form>

            {backToSignIn}
        </AuthCard>
    );
}
