"use client";

import type {
    AcceptOrganizationInvitationResponse,
    OrganizationInvitationPreviewDTO,
} from "@repo/sdk/src/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export function previewInvitation(
    token: string
): Promise<OrganizationInvitationPreviewDTO> {
    return apiClient.organization.previewInvitation(token);
}

/**
 * Public: the page is opened before signing in, often before having an account. A
 * refused token is an answer, not a transient failure, so it is not retried.
 */
export function useInvitationPreview(token: string | null) {
    const { data, isLoading, error } = useQuery({
        queryKey: queryKeys.invitation.preview(token ?? ""),
        queryFn: () => previewInvitation(token as string),
        enabled: Boolean(token),
        retry: false,
    });

    return { data, isLoading, error };
}

export function useAcceptInvitation() {
    return useMutation<AcceptOrganizationInvitationResponse, Error, string>({
        mutationFn: (token: string) =>
            apiClient.organization.acceptInvitation(token),
    });
}

/** The `error.code` the API answered with, read off the response the SDK let through. */
export function apiErrorCodeOf(error: unknown): string | null {
    const code = (
        error as {
            response?: { data?: { error?: { code?: unknown } } };
        } | null
    )?.response?.data?.error?.code;
    return typeof code === "string" ? code : null;
}
