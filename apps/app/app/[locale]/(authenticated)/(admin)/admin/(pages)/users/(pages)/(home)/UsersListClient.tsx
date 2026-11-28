"use client";

import useAuth from "@repo/auth/provider";
import {
    ActionsMenu,
    AddButton,
    Table,
} from "@repo/design-system/components/ui";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Switch } from "@repo/design-system/components/ui/switch";
import { getDictionary } from "@repo/internationalization/client";
import { UserType, type UserWithAuthDTO } from "@repo/sdk/src/types";
import { useRouter } from "next/navigation";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { RecordAvatar } from "@/shared/components/ui/RecordAvatar";
import { useListUsers } from "@/shared/hooks/useListUsers";
import { useFormatDisplayDateTime } from "@/shared/lib/formatDisplayDateTime";
import { ADMIN_ROUTES } from "../../../../paths";
import { useUserCrud } from "../../(hooks)/useUserCrud";

export function UsersListClient() {
    const { data: users, isLoading, refetch, isFetching } = useListUsers();
    const router = useRouter();
    const { dictionary, locale } = getDictionary();
    const formatDateTime = useFormatDisplayDateTime();
    const { deleteUserMutation, toggleUserStatusMutation } = useUserCrud();
    const { user: signedInUser } = useAuth();

    const isOwnRow = (record: UserWithAuthDTO) =>
        record.uid === signedInUser?.uid;

    const routes = ADMIN_ROUTES(dictionary, locale);
    const adminUsersList = dictionary.apps.app.pages.admin.users.list;

    const lastAccessLabels = adminUsersList.lastAccess;

    const typeLabel = (type: UserType) =>
        type === UserType.ADMIN
            ? adminUsersList.typeLabels.admin
            : adminUsersList.typeLabels.common;

    /**
     * `lastRefreshTime` measures a Firebase Auth token refresh, not product use, so it is
     * shown dimmed and labelled: reading it as a real access would answer the question the
     * column header asks with a different number.
     */
    const renderLastAccess = (record: UserWithAuthDTO) => {
        if (record.lastAccessAt) {
            return (
                <span className="whitespace-nowrap">
                    {formatDateTime(record.lastAccessAt)}
                </span>
            );
        }

        const fromProvider = record.metadata?.lastRefreshTime;
        if (fromProvider) {
            return (
                <span
                    className="whitespace-nowrap text-muted-foreground italic"
                    title={lastAccessLabels.approximate}
                >
                    {formatDateTime(fromProvider)}
                </span>
            );
        }

        return (
            <span className="text-muted-foreground">
                {lastAccessLabels.never}
            </span>
        );
    };

    const columns = [
        {
            title: (
                <span className="sr-only">{adminUsersList.columns.photo}</span>
            ),
            dataIndex: "photoURL",
            className: "w-14 pr-0",
            render: (value: string | null, record: UserWithAuthDTO) => (
                <RecordAvatar
                    name={
                        record.displayName ??
                        record.email ??
                        adminUsersList.columns.photo
                    }
                    src={value}
                />
            ),
        },
        {
            title: adminUsersList.columns.name,
            dataIndex: "displayName",
            render: (value: string | null) =>
                value ? (
                    <span className="block min-w-40 max-w-xs font-medium [overflow-wrap:anywhere]">
                        {value}
                    </span>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        {
            title: adminUsersList.columns.email,
            dataIndex: "email",
            render: (value: string | null) => (
                <span className="block min-w-48 max-w-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {value ?? "—"}
                </span>
            ),
        },
        {
            title: adminUsersList.columns.type,
            dataIndex: "type",
            render: (value: UserType) => (
                <Badge
                    variant={value === UserType.ADMIN ? "default" : "secondary"}
                >
                    {typeLabel(value)}
                </Badge>
            ),
        },
        {
            title: adminUsersList.columns.status,
            dataIndex: "disabled",
            align: "center" as const,
            render: (value: boolean, record: UserWithAuthDTO) => (
                <div className="flex justify-center">
                    <Switch
                        aria-label={adminUsersList.statusToggle.replace(
                            "{name}",
                            record.displayName ?? record.email ?? ""
                        )}
                        checked={!value}
                        disabled={
                            isOwnRow(record) ||
                            (toggleUserStatusMutation.isPending &&
                                toggleUserStatusMutation.variables?.id ===
                                    record.id)
                        }
                        onCheckedChange={(checked) => {
                            const nextDisabled = !checked;
                            if (nextDisabled === value) {
                                return;
                            }
                            toggleUserStatusMutation.mutate({
                                id: record.id,
                                disabled: nextDisabled,
                            });
                        }}
                        title={
                            isOwnRow(record)
                                ? adminUsersList.selfStatusLocked
                                : undefined
                        }
                    />
                </div>
            ),
        },
        {
            title: adminUsersList.columns.lastAccess,
            dataIndex: "lastAccessAt",
            render: (_: unknown, record: UserWithAuthDTO) =>
                renderLastAccess(record),
        },
        {
            title: (
                <span className="sr-only">
                    {adminUsersList.columns.actions}
                </span>
            ),
            dataIndex: "actions",
            align: "right" as const,
            className: "w-16",
            render: (_: unknown, record: UserWithAuthDTO) => (
                <ActionsMenu
                    deleteLabels={{
                        action: adminUsersList.archive.action,
                        confirmTitle: adminUsersList.archive.confirmTitle,
                        confirmDescription:
                            adminUsersList.archive.confirmDescription,
                    }}
                    onDelete={
                        isOwnRow(record)
                            ? undefined
                            : () => deleteUserMutation.mutate(record.id)
                    }
                    onEdit={() =>
                        router.push(routes.users.update(record.id).url)
                    }
                />
            ),
        },
    ];

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: routes.root.label, href: routes.root.url },
                ]}
                page={routes.users.list.label}
            />
            <Container
                header={
                    <PageHeader
                        actions={
                            <AddButton
                                onClick={() =>
                                    router.push(routes.users.create.url)
                                }
                            />
                        }
                        title={routes.users.list.label}
                    />
                }
                loading={isLoading}
            >
                <div className="flex w-full flex-col gap-6">
                    <Table<UserWithAuthDTO>
                        columns={columns}
                        dataSource={users ?? []}
                        locale={{ emptyText: adminUsersList.empty }}
                        onRefresh={() => refetch()}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            hideOnSinglePage: true,
                        }}
                        refreshLoading={isFetching}
                        rowKey={(row) => row.id}
                        searchFields={["displayName", "email"]}
                        searchPlaceholder={adminUsersList.searchPlaceholder}
                    />
                </div>
            </Container>
        </>
    );
}
