"use client";

import useAuth from "@repo/auth/provider";
import {
    Button,
    buttonVariants,
} from "@repo/design-system/components/ui/button";
import useAlert from "@repo/design-system/hooks/useAlert";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { FullScreenLoader } from "@/shared/components/ui/FullScreenLoader";
import { withRedirectQuery } from "@/shared/lib/authRedirectLink";
import { useFormatDisplayDateTime } from "@/shared/lib/formatDisplayDateTime";
import { queryKeys } from "@/shared/lib/queryKeys";
import { usePanelState } from "@/shared/stores/panelStore";
import { AuthCard } from "../../components/AuthCard";
import {
    apiErrorCodeOf,
    useAcceptInvitation,
    useInvitationPreview,
} from "../hooks/useInvitation";

type InvitationAcceptanceProps = {
    readonly token: string | null;
    /** The address of the signed-in account, resolved on the server; `null` without a session. */
    readonly signedInEmail: string | null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function InvitationAcceptance({
    token,
    signedInEmail,
}: InvitationAcceptanceProps) {
    const { dictionary, locale } = getDictionary();
    const invitationCopy = dictionary.apps.app.pages.invitation;
    const router = useRouter();
    const queryClient = useQueryClient();
    const { successAlert, errorAlert } = useAlert();
    const { signOut } = useAuth();
    const formatDateTime = useFormatDisplayDateTime();
    const sdkAuthorized = usePanelState((state) => state.sdkAuthorized);
    const preview = useInvitationPreview(token);
    const acceptMutation = useAcceptInvitation();
    const acceptInFlightRef = useRef(false);

    const invitePath = token
        ? `/${locale}/invite?token=${encodeURIComponent(token)}`
        : `/${locale}/invite`;
    const signInHref = withRedirectQuery(`/${locale}/sign-in`, invitePath);
    const signUpHref = withRedirectQuery(`/${locale}/sign-up`, invitePath);

    const goToSignIn = (
        <div className="text-center text-sm">
            <Link
                className="text-primary hover:underline"
                href={`/${locale}/sign-in`}
            >
                {invitationCopy.goToSignIn}
            </Link>
        </div>
    );

    if (!token) {
        return (
            <AuthCard
                description={invitationCopy.invalidBody}
                title={invitationCopy.invalidTitle}
            >
                {goToSignIn}
            </AuthCard>
        );
    }

    if (preview.isLoading) {
        return (
            <div className="space-y-4">
                <FullScreenLoader />
                <p className="text-center text-muted-foreground text-sm">
                    {invitationCopy.loading}
                </p>
            </div>
        );
    }

    if (preview.error || !preview.data) {
        const code = apiErrorCodeOf(preview.error);
        if (code === "ORGANIZATION_INVITATION_EXPIRED") {
            return (
                <AuthCard
                    description={invitationCopy.expiredBody}
                    title={invitationCopy.expiredTitle}
                >
                    {goToSignIn}
                </AuthCard>
            );
        }
        const isRefusedToken =
            code === "ORGANIZATION_INVITATION_INVALID" ||
            code === "VALIDATION_FAILED";
        return (
            <AuthCard
                description={
                    isRefusedToken
                        ? invitationCopy.invalidBody
                        : handleClientError(
                              new FormattedError(preview.error, locale)
                          )
                }
                title={invitationCopy.invalidTitle}
            >
                {goToSignIn}
            </AuthCard>
        );
    }

    const invitation = preview.data;
    const description = invitation.inviterEmail
        ? invitationCopy.invitedBy
              .replace("{inviter}", invitation.inviterEmail)
              .replace("{email}", invitation.email)
        : invitationCopy.invitedByUnknown.replace("{email}", invitation.email);
    const validity = invitationCopy.expiresAt.replace(
        "{date}",
        formatDateTime(invitation.expiresAt)
    );

    if (!signedInEmail) {
        return (
            <AuthCard description={description} title={invitationCopy.title}>
                <div className="space-y-4">
                    <p className="text-center text-muted-foreground text-sm">
                        {validity}
                    </p>
                    <p className="text-center text-sm">
                        {invitationCopy.signInPrompt.replace(
                            "{email}",
                            invitation.email
                        )}
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Link
                            className={cn(buttonVariants(), "flex-1")}
                            href={signInHref}
                        >
                            {invitationCopy.signIn}
                        </Link>
                        <Link
                            className={cn(
                                buttonVariants({ variant: "outline" }),
                                "flex-1"
                            )}
                            href={signUpHref}
                        >
                            {invitationCopy.signUp}
                        </Link>
                    </div>
                </div>
            </AuthCard>
        );
    }

    const signedInAs = invitationCopy.signedInAs.replace(
        "{email}",
        signedInEmail
    );

    if (normalizeEmail(signedInEmail) !== normalizeEmail(invitation.email)) {
        return (
            <AuthCard description={description} title={invitationCopy.title}>
                <div className="space-y-4 text-center text-sm">
                    <p>{signedInAs}</p>
                    <p className="text-destructive">
                        {invitationCopy.emailMismatch.replace(
                            "{email}",
                            invitation.email
                        )}
                    </p>
                    <Button
                        className="w-full"
                        loading={signOut.isPending}
                        onClick={() =>
                            signOut.mutate(undefined, {
                                onSuccess: () => router.push(signInHref),
                            })
                        }
                        type="button"
                        variant="outline"
                    >
                        {invitationCopy.switchAccount}
                    </Button>
                </div>
            </AuthCard>
        );
    }

    // The token is single use, so a double click must not send two requests.
    const accept = () => {
        if (acceptInFlightRef.current) {
            return;
        }
        acceptInFlightRef.current = true;
        acceptMutation.mutate(token, {
            onSuccess: async () => {
                // Every cached query belongs to the organization the person just left. The
                // preview on screen is kept: refetched now, the spent token would answer
                // "invalid" and flash that card before the redirect.
                await queryClient.resetQueries({
                    predicate: (query) =>
                        query.queryKey[0] !== queryKeys.invitation.all[0],
                });
                successAlert(invitationCopy.accepted);
                router.push(`/${locale}/organization`);
            },
            onError: (error) => {
                acceptInFlightRef.current = false;
                errorAlert(
                    handleClientError(new FormattedError(error, locale))
                );
            },
        });
    };

    return (
        <AuthCard description={description} title={invitationCopy.title}>
            <div className="space-y-4 text-sm">
                <p className="text-center">{signedInAs}</p>
                <p className="text-center text-muted-foreground">{validity}</p>
                <p className="rounded-md border border-border bg-muted/50 p-3 text-muted-foreground">
                    {invitationCopy.previousOrganizationNotice}
                </p>
                <Button
                    className="w-full"
                    disabled={!sdkAuthorized || acceptMutation.isPending}
                    loading={acceptMutation.isPending}
                    onClick={accept}
                    type="button"
                >
                    {invitationCopy.accept}
                </Button>
            </div>
        </AuthCard>
    );
}
