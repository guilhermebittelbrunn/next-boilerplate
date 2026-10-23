"use client";

import { ActionsMenu, Table } from "@repo/design-system/components/ui";
import { Badge } from "@repo/design-system/components/ui/badge";
import { getDictionary } from "@repo/internationalization/client";
import type { OrganizationMemberDTO } from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useFormatDisplayDateTime } from "@/shared/lib/formatDisplayDateTime";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useListOrganizationMembers } from "../(hooks)/useListOrganizationMembers";
import { useOrganizationActions } from "../(hooks)/useOrganizationActions";

type OrganizationMembersTableProps = {
    readonly isOwner: boolean;
};

export function OrganizationMembersTable({
    isOwner,
}: OrganizationMembersTableProps) {
    const { dictionary, locale } = getDictionary();
    const { isImpersonating } = useAuthRequestPanel();
    const formatDateTime = useFormatDisplayDateTime();
    const {
        data: members,
        isLoading,
        isFetching,
        error,
        refetch,
    } = useListOrganizationMembers();
    const { removeMemberMutation } = useOrganizationActions();
    const membersCopy = dictionary.apps.app.pages.common.organization.members;

    const loadError = error
        ? handleClientError(new FormattedError(error, locale))
        : null;
    const canRemove = isOwner && !isImpersonating;

    const columns = [
        {
            title: membersCopy.columns.name,
            dataIndex: "displayName",
            render: (value: string | null) => (
                <span className="font-medium">
                    {value ?? membersCopy.unnamed}
                </span>
            ),
        },
        {
            title: membersCopy.columns.email,
            dataIndex: "email",
            render: (value: string | null) =>
                value ?? (
                    <span className="text-muted-foreground">
                        {membersCopy.noEmail}
                    </span>
                ),
        },
        {
            title: membersCopy.columns.role,
            dataIndex: "role",
            render: (value: OrganizationMemberDTO["role"]) => (
                <Badge variant={value === "owner" ? "default" : "secondary"}>
                    {membersCopy.roles[value]}
                </Badge>
            ),
        },
        {
            title: membersCopy.columns.joinedAt,
            dataIndex: "joinedAt",
            render: (value: string) => formatDateTime(value),
        },
        ...(isOwner
            ? [
                  {
                      title: membersCopy.columns.actions,
                      dataIndex: "actions",
                      align: "center" as const,
                      render: (_: unknown, record: OrganizationMemberDTO) =>
                          record.role === "owner" || !canRemove ? null : (
                              <ActionsMenu
                                  deleteLabels={{
                                      action: membersCopy.remove,
                                      confirmTitle:
                                          membersCopy.removeConfirmTitle,
                                      confirmDescription:
                                          membersCopy.removeConfirmDescription,
                                  }}
                                  onDelete={() =>
                                      removeMemberMutation.mutate(record.userId)
                                  }
                              />
                          ),
                  },
              ]
            : []),
    ];

    return (
        <section className="flex flex-col gap-3">
            <h2 className="font-semibold text-lg">{membersCopy.title}</h2>
            <Table<OrganizationMemberDTO>
                columns={columns}
                dataSource={loadError ? [] : members}
                loading={isLoading}
                locale={{ emptyText: loadError ?? membersCopy.emptyText }}
                onRefresh={() => refetch()}
                pagination={false}
                refreshLoading={isFetching}
                rowKey={(row) => row.userId}
                searchFields={["displayName", "email"]}
                searchPlaceholder={membersCopy.searchPlaceholder}
            />
        </section>
    );
}
