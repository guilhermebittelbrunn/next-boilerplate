"use client";

import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import {
    CircleAlertIcon,
    CircleCheckIcon,
    Link2OffIcon,
    TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useEmailVerification } from "@/shared/hooks/useEmailVerification";
import { apiErrorCodeOf } from "@/shared/lib/apiErrorCode";
import { AuthActionLink } from "../../components/AuthActionLink";
import { AuthCard } from "../../components/AuthCard";
import { AuthPending } from "../../components/AuthPending";

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
        <AuthActionLink href={`/${locale}`}>
            {emailVerificationCopy.goToPanel}
        </AuthActionLink>
    );

    const signInLink = (
        <AuthActionLink href={`/${locale}/sign-in`}>
            {changeEmailCopy.signIn}
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

    if (confirmEmailChangeMutation.isError) {
        // The address has already moved; only ending the older sessions failed.
        if (
            apiErrorCodeOf(confirmEmailChangeMutation.error) ===
            "AUTH_SESSIONS_NOT_REVOKED"
        ) {
            return (
                <AuthCard
                    description={handleClientError(
                        new FormattedError(
                            confirmEmailChangeMutation.error,
                            locale
                        )
                    )}
                    icon={TriangleAlertIcon}
                    title={changeEmailCopy.success.title}
                    tone="warning"
                >
                    {signInLink}
                </AuthCard>
            );
        }

        return (
            <AuthCard
                description={changeEmailCopy.error.description}
                icon={CircleAlertIcon}
                title={changeEmailCopy.error.title}
                tone="destructive"
            >
                {panelLink}
            </AuthCard>
        );
    }

    if (confirmEmailChangeMutation.isSuccess) {
        return (
            <AuthCard
                description={changeEmailCopy.success.description}
                icon={CircleCheckIcon}
                title={changeEmailCopy.success.title}
                tone="success"
            >
                {signInLink}
            </AuthCard>
        );
    }

    return <AuthPending message={changeEmailCopy.confirming} />;
}
