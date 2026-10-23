"use client";

import { ActionsMenu, Table } from "@repo/design-system/components/ui";
import { Badge } from "@repo/design-system/components/ui/badge";
import { getDictionary } from "@repo/internationalization/client";
import type { OrganizationInvitationDTO } from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { SendIcon } from "lucide-react";
import { useFormatDisplayDateTime } from "@/shared/lib/formatDisplayDateTime";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useListOrganizationInvitations } from "../(hooks)/useListOrganizationInvitations";
import { useOrganizationActions } from "../(hooks)/useOrganizationActions";

export function OrganizationInvitationsTable() {
    const { dictionary, locale } = getDictionary();
    const { isImpersonating } = useAuthRequestPanel();
    const formatDateTime = useFormatDisplayDateTime();
    const {
        data: invitations,
        isLoading,
        isFetching,
        error,
        refetch,
    } = useListOrganizationInvitations(true);
    const { inviteMutation, revokeInvitationMutation } =
        useOrganizationActions();
    const invitationsCopy =
        dictionary.apps.app.pages.common.organization.invitations;

    const loadError = error
        ? handleClientError(new FormattedError(error, locale))
        : null;

    const columns = [
        {
            title: invitationsCopy.columns.email,
            dataIndex: "email",
            render: (value: string) => (
                <span className="font-medium">{value}</span>
            ),
        },
        {
            title: invitationsCopy.columns.lastSentAt,
            dataIndex: "lastSentAt",
            render: (value: string) => formatDateTime(value),
        },
        {
            title: invitationsCopy.columns.expiresAt,
            dataIndex: "expiresAt",
            render: (value: string, record: OrganizationInvitationDTO) =>
                record.status === "expired" ? (
                    <Badge variant="destructive">
                        {invitationsCopy.expired}
                    </Badge>
                ) : (
                    formatDateTime(value)
                ),
        },
        {
            title: invitationsCopy.columns.actions,
            dataIndex: "actions",
            align: "center" as const,
            render: (_: unknown, record: OrganizationInvitationDTO) =>
                isImpersonating ? null : (
                    <ActionsMenu
                        deleteLabels={{
                            action: invitationsCopy.revoke,
                            confirmTitle: invitationsCopy.revokeConfirmTitle,
                            confirmDescription:
                                invitationsCopy.revokeConfirmDescription,
                        }}
                        items={[
                            {
                                icon: (
                                    <SendIcon aria-hidden className="size-4" />
                                ),
                                key: "resend",
                                label: invitationsCopy.resend,
                                onClick: () =>
                                    inviteMutation.mutate({
                                        email: record.email,
                                        isResend: true,
                                    }),
                            },
                        ]}
                        onDelete={() =>
                            revokeInvitationMutation.mutate(record.id)
                        }
                    />
                ),
        },
    ];

    return (
        <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-lg">{invitationsCopy.title}</h2>
            <Table<OrganizationInvitationDTO>
                columns={columns}
                dataSource={loadError ? [] : invitations}
                loading={isLoading}
                locale={{ emptyText: loadError ?? invitationsCopy.emptyText }}
                onRefresh={() => refetch()}
                pagination={false}
                refreshLoading={isFetching}
                rowKey={(row) => row.id}
                searchFields={["email"]}
                searchPlaceholder={invitationsCopy.searchPlaceholder}
            />
        </section>
    );
}
