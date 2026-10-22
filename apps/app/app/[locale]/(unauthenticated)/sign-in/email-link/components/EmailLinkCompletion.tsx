"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import useAuth from "@repo/auth/provider";
import { HookFormInput } from "@repo/design-system/components/form/hookform";
import { Button } from "@repo/design-system/components/ui/button";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { FullScreenLoader } from "@/shared/components/ui/FullScreenLoader";
import {
    emailLinkFailureOf,
    forgetRememberedEmail,
    readRememberedEmail,
} from "@/shared/lib/emailLinkSignIn";
import { AuthCard } from "../../../components/AuthCard";
import {
    buildEmailLinkSchema,
    type EmailLinkFormValues,
} from "../validations/emailLinkSchema";

type EmailLinkCompletionProps = {
    readonly oobCode: string | null;
};

type RememberedEmail =
    | { status: "reading" }
    | { status: "read"; email: string | null };

export function EmailLinkCompletion({ oobCode }: EmailLinkCompletionProps) {
    const { dictionary, locale } = getDictionary();
    const emailLinkCopy = dictionary.apps.app.pages.emailLinkSignIn;
    const completeCopy = emailLinkCopy.complete;
    const { signInWithEmailLink } = useAuth();
    const { mutate } = signInWithEmailLink;
    const [remembered, setRemembered] = useState<RememberedEmail>({
        status: "reading",
    });
    const attemptInFlightRef = useRef(false);
    const autoAttemptedRef = useRef(false);

    const schema = useMemo(
        () => buildEmailLinkSchema(dictionary),
        [dictionary]
    );

    const form = useForm<EmailLinkFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { email: "" },
    });
    const { setError } = form;

    const attemptSignIn = useCallback(
        (email: string) => {
            if (!oobCode || attemptInFlightRef.current) {
                return;
            }
            attemptInFlightRef.current = true;
            mutate(
                { email, oobCode },
                {
                    onSuccess: forgetRememberedEmail,
                    onError: (error) => {
                        if (emailLinkFailureOf(error) === "mismatch") {
                            setError("email", {
                                message: completeCopy.mismatch,
                            });
                        }
                    },
                    onSettled: () => {
                        attemptInFlightRef.current = false;
                    },
                }
            );
        },
        [oobCode, mutate, setError, completeCopy.mismatch]
    );

    // Storage only exists in the browser, so it is read after hydration.
    useEffect(() => {
        setRemembered({ status: "read", email: readRememberedEmail() });
    }, []);

    // The code is single use, so it is spent at most once per mount even though React
    // runs effects twice in development. Without a remembered address nothing reaches
    // Firebase until the person types it, so a mail scanner opening the link spends nothing.
    useEffect(() => {
        if (
            remembered.status !== "read" ||
            !remembered.email ||
            autoAttemptedRef.current
        ) {
            return;
        }
        autoAttemptedRef.current = true;
        attemptSignIn(remembered.email);
    }, [remembered, attemptSignIn]);

    const requestAnother = (
        <div className="text-center text-sm">
            <Link
                className="text-primary hover:underline"
                href={`/${locale}/sign-in/email-link`}
            >
                {emailLinkCopy.requestAnother}
            </Link>
        </div>
    );

    if (!oobCode) {
        return (
            <AuthCard
                description={completeCopy.invalid.description}
                title={completeCopy.invalid.title}
            >
                {requestAnother}
            </AuthCard>
        );
    }

    const failure = signInWithEmailLink.isError
        ? emailLinkFailureOf(signInWithEmailLink.error)
        : null;

    if (failure === "expired" || failure === "invalid") {
        const failureCopy = completeCopy[failure];
        return (
            <AuthCard
                description={failureCopy.description}
                title={failureCopy.title}
            >
                {requestAnother}
            </AuthCard>
        );
    }

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

    if (failure === "other") {
        return (
            <AuthCard
                description={handleClientError(
                    new FormattedError(signInWithEmailLink.error, locale)
                )}
                title={completeCopy.failed.title}
            >
                {backToSignIn}
            </AuthCard>
        );
    }

    // A resolved attempt has spent the code, so offering the form again would only earn a
    // refusal. The provider reports a session it could not store as an alert and stays
    // put; the sign-in screen retries that session, which makes it the way out.
    if (signInWithEmailLink.isSuccess) {
        return (
            <div className="space-y-4">
                <FullScreenLoader />
                <p className="text-center text-muted-foreground text-sm">
                    {completeCopy.signingIn}
                </p>
                {backToSignIn}
            </div>
        );
    }

    const asksForEmail =
        remembered.status === "read" &&
        (failure === "mismatch" || !remembered.email);

    if (!asksForEmail) {
        return (
            <div className="space-y-4">
                <FullScreenLoader />
                <p className="text-center text-muted-foreground text-sm">
                    {completeCopy.signingIn}
                </p>
            </div>
        );
    }

    return (
        <AuthCard
            description={completeCopy.confirm.description}
            title={completeCopy.confirm.title}
        >
            <Form {...form}>
                <form
                    className="space-y-4"
                    onSubmit={form.handleSubmit((values) =>
                        attemptSignIn(values.email)
                    )}
                >
                    <HookFormInput
                        label={emailLinkCopy.request.form.email}
                        name="email"
                        placeholder={
                            emailLinkCopy.request.form.emailPlaceholder
                        }
                        type="email"
                    />

                    <Button
                        className="w-full"
                        disabled={signInWithEmailLink.isPending}
                        loading={signInWithEmailLink.isPending}
                        type="submit"
                    >
                        {completeCopy.confirm.submit}
                    </Button>
                </form>
            </Form>

            {requestAnother}
        </AuthCard>
    );
}
