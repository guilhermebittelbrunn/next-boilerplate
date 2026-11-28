"use client";

import { ActionsMenu, Table } from "@repo/design-system/components/ui";
import { Badge } from "@repo/design-system/components/ui/badge";
import { getDictionary } from "@repo/internationalization/client";
import type { OrganizationMemberDTO } from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { CrownIcon } from "lucide-react";
import { useRef, useState } from "react";
import { SettingsSection } from "@/shared/components/ui/SettingsSection";
import { useFormatDisplayDateTime } from "@/shared/lib/formatDisplayDateTime";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { useListOrganizationMembers } from "../(hooks)/useListOrganizationMembers";
import { useOrganizationActions } from "../(hooks)/useOrganizationActions";
import { TransferOwnershipDialog } from "./TransferOwnershipDialog";

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
    const { removeMemberMutation, transferOwnershipMutation } =
        useOrganizationActions();
    const [transferTarget, setTransferTarget] =
        useState<OrganizationMemberDTO | null>(null);
    const [isTransferOpen, setTransferOpen] = useState(false);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const organizationCopy = dictionary.apps.app.pages.common.organization;
    const membersCopy = organizationCopy.members;

    const loadError = error
        ? handleClientError(new FormattedError(error, locale))
        : null;
    // The actions leave the screen while a transfer runs, so a second click cannot send
    // another one from this table.
    const canManage =
        isOwner && !isImpersonating && !transferOwnershipMutation.isPending;

    const columns = [
        {
            title: membersCopy.columns.name,
            dataIndex: "displayName",
            render: (value: string | null, record: OrganizationMemberDTO) => (
                <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="break-words font-medium">
                        {value ?? membersCopy.unnamed}
                    </span>
                    <span className="break-all text-muted-foreground text-xs">
                        {record.email ?? membersCopy.noEmail}
                    </span>
                </div>
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
            render: (value: string) => (
                <span className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(value)}
                </span>
            ),
        },
        ...(isOwner
            ? [
                  {
                      title: membersCopy.columns.actions,
                      dataIndex: "actions",
                      align: "right" as const,
                      render: (_: unknown, record: OrganizationMemberDTO) =>
                          record.role === "owner" || !canManage ? null : (
                              <ActionsMenu
                                  deleteLabels={{
                                      action: membersCopy.remove,
                                      confirmTitle:
                                          membersCopy.removeConfirmTitle,
                                      confirmDescription:
                                          membersCopy.removeConfirmDescription,
                                  }}
                                  items={
                                      record.archived
                                          ? []
                                          : [
                                                {
                                                    icon: (
                                                        <CrownIcon
                                                            aria-hidden
                                                            className="size-4"
                                                        />
                                                    ),
                                                    key: "transfer",
                                                    label: organizationCopy
                                                        .transfer.action,
                                                    onClick: () => {
                                                        setTransferTarget(
                                                            record
                                                        );
                                                        setTransferOpen(true);
                                                    },
                                                },
                                            ]
                                  }
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
        <SettingsSection
            headingLevel={2}
            surface={false}
            title={membersCopy.title}
            titleRef={titleRef}
        >
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
            <TransferOwnershipDialog
                member={transferTarget}
                onConfirm={(member) => transferOwnershipMutation.mutate(member)}
                onOpenChange={setTransferOpen}
                open={isTransferOpen}
                returnFocusRef={titleRef}
            />
        </SettingsSection>
    );
}
