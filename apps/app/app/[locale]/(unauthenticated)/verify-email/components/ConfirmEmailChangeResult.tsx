"use client";

import { getDictionary } from "@repo/internationalization/client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { FullScreenLoader } from "@/shared/components/ui/FullScreenLoader";
import { useEmailVerification } from "@/shared/hooks/useEmailVerification";
import { AuthCard } from "../../components/AuthCard";

type ConfirmEmailChangeResultProps = {
    readonly oobCode: string | null;
};

export function ConfirmEmailChangeResult({
    oobCode,
}: ConfirmEmailChangeResultProps) {
    const { dictionary, locale } = getDictionary();
    const { confirmEmailChangeMutation } = useEmailVerification();
    const emailVerificationCopy = dictionary.apps.app.pages.emailVerification;
    const changeEmailCopy = emailVerificationCopy.changeEmail;
    const submittedRef = useRef(false);
    const { mutate } = confirmEmailChangeMutation;

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

    if (confirmEmailChangeMutation.isError) {
        return (
            <AuthCard
                description={changeEmailCopy.error.description}
                title={changeEmailCopy.error.title}
            >
                {panelLink}
            </AuthCard>
        );
    }

    if (confirmEmailChangeMutation.isSuccess) {
        return (
            <AuthCard
                description={changeEmailCopy.success.description}
                title={changeEmailCopy.success.title}
            >
                <div className="text-center text-sm">
                    <Link
                        className="text-primary hover:underline"
                        href={`/${locale}/sign-in`}
                    >
                        {changeEmailCopy.signIn}
                    </Link>
                </div>
            </AuthCard>
        );
    }

    return (
        <div className="space-y-4">
            <FullScreenLoader />
            <p className="text-center text-muted-foreground text-sm">
                {changeEmailCopy.confirming}
            </p>
        </div>
    );
}
