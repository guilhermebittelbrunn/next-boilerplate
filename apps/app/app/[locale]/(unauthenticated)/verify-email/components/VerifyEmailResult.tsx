"use client";

import { getDictionary } from "@repo/internationalization/client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { FullScreenLoader } from "@/shared/components/ui/FullScreenLoader";
import { useEmailVerification } from "@/shared/hooks/useEmailVerification";
import { AuthCard } from "../../components/AuthCard";

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
        <div className="text-center text-sm">
            <Link className="text-primary hover:underline" href={`/${locale}`}>
                {emailVerificationCopy.goToPanel}
            </Link>
        </div>
    );

    if (!oobCode) {
        return (
            <AuthCard
                description={emailVerificationCopy.invalidLink.description}
                title={emailVerificationCopy.invalidLink.title}
            >
                {panelLink}
            </AuthCard>
        );
    }

    if (confirmVerificationMutation.isError) {
        return (
            <AuthCard
                description={emailVerificationCopy.error.description}
                title={emailVerificationCopy.error.title}
            >
                {panelLink}
            </AuthCard>
        );
    }

    if (confirmVerificationMutation.isSuccess) {
        return (
            <AuthCard
                description={emailVerificationCopy.success.description}
                title={emailVerificationCopy.success.title}
            >
                {panelLink}
            </AuthCard>
        );
    }

    return (
        <div className="space-y-4">
            <FullScreenLoader />
            <p className="text-center text-muted-foreground text-sm">
                {emailVerificationCopy.confirming}
            </p>
        </div>
    );
}
