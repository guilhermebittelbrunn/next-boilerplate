"use client";

import {
    ActionsMenu,
    AddButton,
    Table,
} from "@repo/design-system/components/ui";
import ResponsiveImage from "@repo/design-system/components/ui/responsive-image";
import { Switch } from "@repo/design-system/components/ui/switch";
import { getDictionary } from "@repo/internationalization/client";
import { UserType, type UserWithAuthDTO } from "@repo/sdk/src/types";
import { useRouter } from "next/navigation";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { useListUsers } from "@/shared/hooks/useListUsers";
import { ADMIN_ROUTES } from "../../../../paths";
import { useUserCrud } from "../../(hooks)/useUserCrud";

export function UsersListClient() {
    const { data: users, isLoading, refetch, isFetching } = useListUsers();
    const router = useRouter();
    const { dictionary, locale } = getDictionary();
    const { deleteUserMutation, toggleUserStatusMutation } = useUserCrud();

    const routes = ADMIN_ROUTES(dictionary, locale);
    const adminUsersList = dictionary.apps.app.pages.admin.users.list;

    const typeLabel = (type: UserType) =>
        type === UserType.ADMIN
            ? adminUsersList.typeLabels.admin
            : adminUsersList.typeLabels.common;

    const columns = [
        {
            title: adminUsersList.columns.photo,
            dataIndex: "photoURL",
            render: (value: string | null, record: UserWithAuthDTO) => (
                <ResponsiveImage
                    alt={
                        record.displayName ??
                        record.email ??
                        adminUsersList.columns.photo
                    }
                    className="rounded-full"
                    height={44}
                    src={value ?? undefined}
                    width={44}
                />
            ),
        },
        {
            title: adminUsersList.columns.name,
            dataIndex: "displayName",
            render: (value: string | null) => (
                <span className="font-bold">{value ?? "—"}</span>
            ),
        },
        {
            title: adminUsersList.columns.email,
            dataIndex: "email",
        },
        {
            title: adminUsersList.columns.type,
            dataIndex: "type",
            render: (value: UserType) => typeLabel(value),
        },
        {
            title: adminUsersList.columns.status,
            dataIndex: "disabled",
            align: "center" as const,
            render: (value: boolean, record: UserWithAuthDTO) => (
                <div className="flex justify-center">
                    <Switch
                        checked={!value}
                        disabled={
                            toggleUserStatusMutation.isPending &&
                            toggleUserStatusMutation.variables?.id === record.id
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
                    />
                </div>
            ),
        },
        {
            title: adminUsersList.columns.actions,
            dataIndex: "actions",
            align: "center" as const,
            render: (_: unknown, record: UserWithAuthDTO) => (
                <ActionsMenu
                    onDelete={() => deleteUserMutation.mutate(record.id)}
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
                sideElement={
                    <AddButton
                        onClick={() => router.push(routes.users.create.url)}
                    />
                }
            />
            <Container loading={isLoading}>
                <div className="mx-auto flex w-full flex-col gap-4">
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
