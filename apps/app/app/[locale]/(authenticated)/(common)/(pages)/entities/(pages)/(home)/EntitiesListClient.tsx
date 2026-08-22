"use client";

import {
    ActionsMenu,
    AddButton,
    Table,
} from "@repo/design-system/components/ui";
import ResponsiveImage from "@repo/design-system/components/ui/responsive-image";
import { Switch } from "@repo/design-system/components/ui/switch";
import { getDictionary } from "@repo/internationalization/client";
import { type EntityDTO, EntityType } from "@repo/sdk/src/types";
import { useRouter } from "next/navigation";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { ImpersonationReadOnlyNotice } from "@/shared/components/ui/ImpersonationReadOnlyNotice";
import { formatDisplayDateTime } from "@/shared/lib/formatDisplayDateTime";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { COMMON_ROUTES } from "../../../../paths";
import { useEntityCrud } from "../../(hooks)/useEntityCrud";
import { useListEntities } from "../../(hooks)/useListEntities";

export function EntitiesListClient() {
    const {
        data: entities,
        isLoading,
        refetch,
        isFetching,
    } = useListEntities();
    const router = useRouter();
    const { isImpersonating } = useAuthRequestPanel();
    const { dictionary, locale } = getDictionary();
    const { deleteEntityMutation, toggleEntityStatusMutation } =
        useEntityCrud();

    const routes = COMMON_ROUTES(dictionary, locale);
    const entitiesList = dictionary.apps.app.pages.common.entities.list;

    const typeLabel = (type: EntityType) => {
        if (type === EntityType.FRANCHISE) {
            return entitiesList.typeLabels.franchise;
        }
        if (type === EntityType.CUSTOMER) {
            return entitiesList.typeLabels.customer;
        }
        return entitiesList.typeLabels.collaborator;
    };

    const columns = [
        {
            title: entitiesList.columns.photo,
            dataIndex: "photo",
            render: (value: string | null, record: EntityDTO) =>
                value ? (
                    <ResponsiveImage
                        alt={record.name}
                        className="rounded-full"
                        height={44}
                        src={value}
                        width={44}
                    />
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        {
            title: entitiesList.columns.name,
            dataIndex: "name",
            render: (value: string) => (
                <span className="font-medium">{value}</span>
            ),
        },
        {
            title: entitiesList.columns.type,
            dataIndex: "type",
            render: (value: EntityType) => typeLabel(value),
        },
        {
            title: entitiesList.columns.createdAt,
            dataIndex: "createdAt",
            render: (value: string) => formatDisplayDateTime(value),
        },
        {
            title: entitiesList.columns.enabled,
            dataIndex: "enabled",
            align: "center" as const,
            render: (value: boolean, record: EntityDTO) => (
                <div className="flex justify-center">
                    <Switch
                        checked={value}
                        disabled={
                            isImpersonating ||
                            (toggleEntityStatusMutation.isPending &&
                                toggleEntityStatusMutation.variables?.id ===
                                    record.id)
                        }
                        onCheckedChange={(checked) => {
                            if (checked === value) {
                                return;
                            }
                            toggleEntityStatusMutation.mutate({
                                id: record.id,
                                enabled: checked,
                            });
                        }}
                    />
                </div>
            ),
        },
        {
            title: entitiesList.columns.actions,
            dataIndex: "actions",
            align: "center" as const,
            render: (_: unknown, record: EntityDTO) => (
                <ActionsMenu
                    onDelete={
                        isImpersonating
                            ? undefined
                            : () => deleteEntityMutation.mutate(record.id)
                    }
                    onEdit={() =>
                        router.push(routes.entities.update(record.id).url)
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
                page={routes.entities.list.label}
                sideElement={
                    <AddButton
                        disabled={isImpersonating}
                        onClick={() => router.push(routes.entities.create.url)}
                    />
                }
            />
            <Container loading={isLoading}>
                <div className="mx-auto flex w-full flex-col gap-4">
                    <ImpersonationReadOnlyNotice />
                    <Table<EntityDTO>
                        columns={columns}
                        dataSource={entities ?? []}
                        locale={{ emptyText: entitiesList.empty }}
                        onRefresh={() => refetch()}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            hideOnSinglePage: true,
                        }}
                        refreshLoading={isFetching}
                        rowKey={(row) => row.id}
                        searchFields={["name", "description"]}
                        searchPlaceholder={entitiesList.searchPlaceholder}
                    />
                </div>
            </Container>
        </>
    );
}
