"use client";

import useAuth from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useQueryClient } from "@tanstack/react-query";
import {
    ClockIcon,
    InfoIcon,
    Link2OffIcon,
    UserRoundXIcon,
    UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { apiErrorCodeOf } from "@/shared/lib/apiErrorCode";
import { withRedirectQuery } from "@/shared/lib/authRedirectLink";
import { useFormatDisplayDateTime } from "@/shared/lib/formatDisplayDateTime";
import { queryKeys } from "@/shared/lib/queryKeys";
import { usePanelState } from "@/shared/stores/panelStore";
import { AuthActionLink } from "../../components/AuthActionLink";
import { AuthCard } from "../../components/AuthCard";
import { AuthPending } from "../../components/AuthPending";
import {
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
        <AuthActionLink href={`/${locale}/sign-in`}>
            {invitationCopy.goToSignIn}
        </AuthActionLink>
    );

    if (!token) {
        return (
            <AuthCard
                description={invitationCopy.invalidBody}
                icon={Link2OffIcon}
                title={invitationCopy.invalidTitle}
                tone="warning"
            >
                {goToSignIn}
            </AuthCard>
        );
    }

    if (preview.isLoading) {
        return <AuthPending message={invitationCopy.loading} />;
    }

    if (preview.error || !preview.data) {
        const code = apiErrorCodeOf(preview.error);
        if (code === "ORGANIZATION_INVITATION_EXPIRED") {
            return (
                <AuthCard
                    description={invitationCopy.expiredBody}
                    icon={ClockIcon}
                    title={invitationCopy.expiredTitle}
                    tone="warning"
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
                icon={Link2OffIcon}
                title={invitationCopy.invalidTitle}
                tone="warning"
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
            <AuthCard
                description={description}
                icon={UsersIcon}
                title={invitationCopy.title}
            >
                <div className="flex flex-col gap-1 text-sm">
                    <p className="text-pretty">
                        {invitationCopy.signInPrompt.replace(
                            "{email}",
                            invitation.email
                        )}
                    </p>
                    <p className="text-muted-foreground">{validity}</p>
                </div>
                <div className="flex flex-col gap-2">
                    <AuthActionLink href={signInHref}>
                        {invitationCopy.signIn}
                    </AuthActionLink>
                    <AuthActionLink href={signUpHref} variant="outline">
                        {invitationCopy.signUp}
                    </AuthActionLink>
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
            <AuthCard
                description={description}
                icon={UserRoundXIcon}
                title={invitationCopy.title}
                tone="destructive"
            >
                <div className="flex flex-col gap-1 text-sm">
                    <p className="break-words text-muted-foreground">
                        {signedInAs}
                    </p>
                    <p className="text-pretty text-destructive">
                        {invitationCopy.emailMismatch.replace(
                            "{email}",
                            invitation.email
                        )}
                    </p>
                </div>
                <Button
                    className="w-full"
                    loading={signOut.isPending}
                    onClick={() =>
                        signOut.mutate(undefined, {
                            onSuccess: () => router.push(signInHref),
                        })
                    }
                    size="lg"
                    type="button"
                >
                    {invitationCopy.switchAccount}
                </Button>
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
        <AuthCard
            description={description}
            icon={UsersIcon}
            title={invitationCopy.title}
        >
            <div className="flex flex-col gap-1 text-sm">
                <p className="break-words">{signedInAs}</p>
                <p className="text-muted-foreground">{validity}</p>
            </div>
            <div className="flex gap-3 rounded-lg bg-muted/60 p-4 text-muted-foreground text-sm">
                <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
                <p className="text-pretty">
                    {invitationCopy.previousOrganizationNotice}
                </p>
            </div>
            <Button
                className="w-full"
                disabled={!sdkAuthorized || acceptMutation.isPending}
                loading={acceptMutation.isPending}
                onClick={accept}
                size="lg"
                type="button"
            >
                {invitationCopy.accept}
            </Button>
        </AuthCard>
    );
}
