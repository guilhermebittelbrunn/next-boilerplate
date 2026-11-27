"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import useAuth from "@repo/auth/provider";
import { HookFormInput } from "@repo/design-system/components/form/hookform";
import { Button } from "@repo/design-system/components/ui/button";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { CircleAlertIcon, ClockIcon, Link2OffIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
    emailLinkFailureOf,
    forgetRememberedEmail,
    readRememberedEmail,
} from "@/shared/lib/emailLinkSignIn";
import { AuthActionLink } from "../../../components/AuthActionLink";
import { AuthCard } from "../../../components/AuthCard";
import { AuthPending } from "../../../components/AuthPending";
import { authTextLinkClassName } from "../../../components/authLink";
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

    const requestAnotherHref = `/${locale}/sign-in/email-link`;
    const backToSignInHref = `/${locale}/sign-in`;

    if (!oobCode) {
        return (
            <AuthCard
                description={completeCopy.invalid.description}
                icon={Link2OffIcon}
                title={completeCopy.invalid.title}
                tone="warning"
            >
                <AuthActionLink href={requestAnotherHref}>
                    {emailLinkCopy.requestAnother}
                </AuthActionLink>
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
                icon={failure === "expired" ? ClockIcon : Link2OffIcon}
                title={failureCopy.title}
                tone="warning"
            >
                <AuthActionLink href={requestAnotherHref}>
                    {emailLinkCopy.requestAnother}
                </AuthActionLink>
            </AuthCard>
        );
    }

    const backToSignIn = (
        <Link className={authTextLinkClassName} href={backToSignInHref}>
            {emailLinkCopy.backToSignIn}
        </Link>
    );

    if (failure === "other") {
        return (
            <AuthCard
                description={handleClientError(
                    new FormattedError(signInWithEmailLink.error, locale)
                )}
                icon={CircleAlertIcon}
                title={completeCopy.failed.title}
                tone="destructive"
            >
                <AuthActionLink href={backToSignInHref}>
                    {emailLinkCopy.backToSignIn}
                </AuthActionLink>
            </AuthCard>
        );
    }

    // A resolved attempt has spent the code, so offering the form again would only earn a
    // refusal. A session the provider could not store is reported as an alert and signed
    // out, so going back to sign-in is the way out.
    if (signInWithEmailLink.isSuccess) {
        return (
            <AuthPending message={completeCopy.signingIn}>
                <p className="text-sm">{backToSignIn}</p>
            </AuthPending>
        );
    }

    const asksForEmail =
        remembered.status === "read" &&
        (failure === "mismatch" || !remembered.email);

    if (!asksForEmail) {
        return <AuthPending message={completeCopy.signingIn} />;
    }

    return (
        <AuthCard
            description={completeCopy.confirm.description}
            footer={
                <Link
                    className={authTextLinkClassName}
                    href={requestAnotherHref}
                >
                    {emailLinkCopy.requestAnother}
                </Link>
            }
            title={completeCopy.confirm.title}
        >
            <Form {...form}>
                <form
                    className="flex flex-col gap-4"
                    noValidate
                    onSubmit={form.handleSubmit((values) =>
                        attemptSignIn(values.email)
                    )}
                >
                    <HookFormInput
                        autoComplete="email"
                        label={emailLinkCopy.request.form.email}
                        name="email"
                        placeholder={
                            emailLinkCopy.request.form.emailPlaceholder
                        }
                        spellCheck={false}
                        type="email"
                    />

                    <Button
                        className="mt-2 w-full"
                        disabled={signInWithEmailLink.isPending}
                        loading={signInWithEmailLink.isPending}
                        size="lg"
                        type="submit"
                    >
                        {completeCopy.confirm.submit}
                    </Button>
                </form>
            </Form>
        </AuthCard>
    );
}
