"use client";

import { getDictionary } from "@repo/internationalization/client";
import { CircleAlertIcon, CircleCheckIcon, Link2OffIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useEmailVerification } from "@/shared/hooks/useEmailVerification";
import { AuthActionLink } from "../../components/AuthActionLink";
import { AuthCard } from "../../components/AuthCard";
import { AuthPending } from "../../components/AuthPending";

type VerifyEmailResultProps = {
    readonly oobCode: string | null;
};

export function VerifyEmailResult({ oobCode }: VerifyEmailResultProps) {
    const { dictionary, locale } = getDictionary();
    const { confirmVerificationMutation } = useEmailVerification();
    const emailVerificationCopy = dictionary.apps.app.pages.emailVerification;
    const submittedRef = useRef(false);
    const { mutate } = confirmVerificationMutation;

    // The action code is single use, so it is spent at most once per mount even
    // though React runs effects twice in development.
    useEffect(() => {
        if (!oobCode || submittedRef.current) {
            return;
        }
        submittedRef.current = true;
        mutate(oobCode);
    }, [oobCode, mutate]);

    const panelLink = (
        <AuthActionLink href={`/${locale}`}>
            {emailVerificationCopy.goToPanel}
        </AuthActionLink>
    );

    if (!oobCode) {
        return (
            <AuthCard
                description={emailVerificationCopy.invalidLink.description}
                icon={Link2OffIcon}
                title={emailVerificationCopy.invalidLink.title}
                tone="warning"
            >
                {panelLink}
            </AuthCard>
        );
    }

    if (confirmVerificationMutation.isError) {
        return (
            <AuthCard
                description={emailVerificationCopy.error.description}
                icon={CircleAlertIcon}
                title={emailVerificationCopy.error.title}
                tone="destructive"
            >
                {panelLink}
            </AuthCard>
        );
    }

    if (confirmVerificationMutation.isSuccess) {
        return (
            <AuthCard
                description={emailVerificationCopy.success.description}
                icon={CircleCheckIcon}
                title={emailVerificationCopy.success.title}
                tone="success"
            >
                {panelLink}
            </AuthCard>
        );
    }

    return <AuthPending message={emailVerificationCopy.confirming} />;
}
