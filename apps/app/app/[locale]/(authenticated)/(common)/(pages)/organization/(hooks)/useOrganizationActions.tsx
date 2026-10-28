import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import type {
    CreateOrganizationInvitationRequest,
    OrganizationMemberDTO,
} from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

type InviteInput = CreateOrganizationInvitationRequest & {
    /** Picks the confirmation: a resend from the list says so instead of "sent". */
    isResend?: boolean;
};

export const useOrganizationActions = () => {
    const { successAlert, errorAlert, warningAlert } = useAlert();
    const { dictionary, locale } = getDictionary();
    const queryClient = useQueryClient();
    const organizationCopy = dictionary.apps.app.pages.common.organization;

    const formatClientError = (error: unknown) =>
        handleClientError(new FormattedError(error, locale));

    const inviteMutation = useMutation({
        mutationFn: ({ email }: InviteInput) =>
            apiClient.organization.invite({ email, locale }),
        onSuccess: async (result, variables) => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.organization.invitations(),
            });
            if (result.delivery === "failed") {
                warningAlert(organizationCopy.invite.deliveryFailed);
                return;
            }
            successAlert(
                variables.isResend
                    ? organizationCopy.invitations.resent
                    : organizationCopy.invite.sent
            );
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    const revokeInvitationMutation = useMutation({
        mutationFn: (id: string) => apiClient.organization.revokeInvitation(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.organization.invitations(),
            });
            successAlert(organizationCopy.invitations.revoked);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    const removeMemberMutation = useMutation({
        mutationFn: (userId: string) =>
            apiClient.organization.removeMember(userId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.organization.members(),
            });
            successAlert(organizationCopy.members.removed);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    const memberNameOf = (member: OrganizationMemberDTO) =>
        member.displayName ?? member.email ?? organizationCopy.members.unnamed;

    const transferOwnershipMutation = useMutation({
        mutationFn: (member: OrganizationMemberDTO) =>
            apiClient.organization.transferOwnership(member.userId),
        onSuccess: async (_result, member) => {
            // The role decides which sections render: refetching it first unmounts the
            // owner-only invitations table before anything asks the API for it as a member.
            await queryClient.invalidateQueries({
                queryKey: queryKeys.organization.detail(),
            });
            queryClient.removeQueries({
                queryKey: queryKeys.organization.invitations(),
            });
            await queryClient.invalidateQueries({
                queryKey: queryKeys.organization.members(),
            });
            successAlert(
                organizationCopy.transfer.done.replace(
                    "{name}",
                    memberNameOf(member)
                )
            );
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    // Leaving changes the organization every other query was scoped to, so the whole
    // cache goes, as when the subject changes: `resetQueries` refetches what is on screen.
    const leaveMutation = useMutation({
        mutationFn: () => apiClient.organization.leave(),
        onSuccess: async () => {
            await queryClient.resetQueries();
            successAlert(organizationCopy.leave.done);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    return {
        inviteMutation,
        revokeInvitationMutation,
        removeMemberMutation,
        transferOwnershipMutation,
        leaveMutation,
    };
};
