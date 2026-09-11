"use client";

import useAuth from "@repo/auth/provider";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import { getDictionary } from "@repo/internationalization/client";
import { MailWarningIcon } from "lucide-react";
import { useEmailVerification } from "@/shared/hooks/useEmailVerification";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";

/**
 * Tells the account holder that their address is still unconfirmed and offers a resend.
 * A pending state nobody announces is a pending state nobody acts on, so the notice is
 * a live region of its own rather than a hint hanging off some control.
 */
export function EmailNotVerifiedNotice() {
    const { dictionary } = getDictionary();
    const { user, loading } = useAuth();
    const { isImpersonating } = useAuthRequestPanel();
    const { resendVerificationMutation } = useEmailVerification();

    // An admin acting as someone else must not be able to send mail to that person,
    // and the admin's own verification state is not what this screen is about.
    if (loading || isImpersonating || !user || user.emailVerified) {
        return null;
    }

    const noticeCopy = dictionary.apps.app.pages.emailVerification.notice;

    return (
        <div className="px-4 pt-4">
            <Alert>
                <MailWarningIcon />
                <AlertTitle>{noticeCopy.title}</AlertTitle>
                <AlertDescription>
                    <p>{noticeCopy.description}</p>
                    <Button
                        disabled={resendVerificationMutation.isPending}
                        loading={resendVerificationMutation.isPending}
                        onClick={() => resendVerificationMutation.mutate()}
                        size="sm"
                        type="button"
                        variant="outline"
                    >
                        {noticeCopy.resend}
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    );
}
