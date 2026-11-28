"use client";

import {
    ActionsMenu,
    AddButton,
    Table,
} from "@repo/design-system/components/ui";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Switch } from "@repo/design-system/components/ui/switch";
import { getDictionary } from "@repo/internationalization/client";
import { type EntityDTO, EntityType } from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useRouter } from "next/navigation";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { ImpersonationReadOnlyNotice } from "@/shared/components/ui/ImpersonationReadOnlyNotice";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { RecordAvatar } from "@/shared/components/ui/RecordAvatar";
import { useFormatDisplayDateTime } from "@/shared/lib/formatDisplayDateTime";
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
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        error: listError,
    } = useListEntities();
    const router = useRouter();
    const { isImpersonating } = useAuthRequestPanel();
    const { dictionary, locale } = getDictionary();
    const formatDateTime = useFormatDisplayDateTime();
    const { deleteEntityMutation, toggleEntityStatusMutation } =
        useEntityCrud();

    const routes = COMMON_ROUTES(dictionary, locale);
    const entitiesList = dictionary.apps.app.pages.common.entities.list;
    const listLoadError = listError
        ? handleClientError(new FormattedError(listError, locale))
        : null;

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
            title: (
                <span className="sr-only">{entitiesList.columns.photo}</span>
            ),
            dataIndex: "photoUrl",
            className: "w-14 pr-0",
            render: (value: string | null | undefined, record: EntityDTO) => (
                <RecordAvatar name={record.name} src={value} unoptimized />
            ),
        },
        {
            title: entitiesList.columns.name,
            dataIndex: "name",
            render: (value: string, record: EntityDTO) => (
                <div className="flex min-w-48 max-w-md flex-col">
                    <span className="font-medium [overflow-wrap:anywhere]">
                        {value}
                    </span>
                    {record.description ? (
                        <span
                            className="truncate text-muted-foreground text-xs"
                            title={record.description}
                        >
                            {record.description}
                        </span>
                    ) : null}
                </div>
            ),
        },
        {
            title: entitiesList.columns.type,
            dataIndex: "type",
            render: (value: EntityType) => (
                <Badge variant="secondary">{typeLabel(value)}</Badge>
            ),
        },
        {
            title: entitiesList.columns.createdAt,
            dataIndex: "createdAt",
            render: (value: string) => (
                <span className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(value)}
                </span>
            ),
        },
        {
            title: entitiesList.columns.enabled,
            dataIndex: "enabled",
            align: "center" as const,
            render: (value: boolean, record: EntityDTO) => (
                <div className="flex justify-center">
                    <Switch
                        aria-label={entitiesList.enabledToggle.replace(
                            "{name}",
                            record.name
                        )}
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
            title: (
                <span className="sr-only">{entitiesList.columns.actions}</span>
            ),
            dataIndex: "actions",
            align: "right" as const,
            className: "w-16",
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
            />
            <Container
                header={
                    <PageHeader
                        actions={
                            <AddButton
                                disabled={isImpersonating}
                                onClick={() =>
                                    router.push(routes.entities.create.url)
                                }
                            />
                        }
                        title={routes.entities.list.label}
                    />
                }
                loadError={listLoadError}
                loading={isLoading}
            >
                <div className="flex w-full flex-col gap-6">
                    <ImpersonationReadOnlyNotice />
                    <Table<EntityDTO>
                        columns={columns}
                        dataSource={entities}
                        hasMore={hasNextPage}
                        loadMoreLoading={isFetchingNextPage}
                        locale={{ emptyText: entitiesList.empty }}
                        onLoadMore={() => fetchNextPage()}
                        onRefresh={() => refetch()}
                        pagination={false}
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
