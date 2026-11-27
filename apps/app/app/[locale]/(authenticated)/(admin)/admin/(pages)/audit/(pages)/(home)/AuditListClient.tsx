"use client";

import { Table } from "@repo/design-system/components/ui";
import { Badge } from "@repo/design-system/components/ui/badge";
import { getDictionary } from "@repo/internationalization/client";
import {
    type AuditAction,
    type AuditEventDTO,
    AuditLevel,
} from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { ShieldAlertIcon } from "lucide-react";
import { useState } from "react";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { LoadErrorState } from "@/shared/components/ui/LoadErrorState";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { useFormatDisplayDateTime } from "@/shared/lib/formatDisplayDateTime";
import { ADMIN_ROUTES } from "../../../../paths";
import { AuditFilters } from "../../(components)/AuditFilters";
import {
    type AuditEventFilters,
    useListAuditEvents,
} from "../../(hooks)/useListAuditEvents";

export function AuditListClient() {
    const [filters, setFilters] = useState<AuditEventFilters>({});
    const {
        data: auditEvents,
        isLoading,
        refetch,
        isFetching,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        error: listError,
    } = useListAuditEvents(filters);
    const { dictionary, locale } = getDictionary();
    const formatDateTime = useFormatDisplayDateTime();

    const routes = ADMIN_ROUTES(dictionary, locale);
    const auditTrailList = dictionary.apps.app.pages.admin.auditTrail.list;
    const listLoadError = listError
        ? handleClientError(new FormattedError(listError, locale))
        : null;

    const emptyCell = (
        <span className="text-muted-foreground">
            {auditTrailList.emptyValue}
        </span>
    );

    const columns = [
        {
            title: auditTrailList.columns.createdAt,
            dataIndex: "createdAt",
            render: (value: string) => (
                <span className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(value)}
                </span>
            ),
        },
        {
            title: auditTrailList.columns.action,
            dataIndex: "action",
            render: (value: AuditAction) => (
                <span className="block min-w-40 font-medium">
                    {auditTrailList.actionLabels[value]}
                </span>
            ),
        },
        {
            title: auditTrailList.columns.level,
            dataIndex: "level",
            render: (value: AuditLevel) =>
                value === AuditLevel.INFO ? (
                    <Badge variant="secondary">
                        {auditTrailList.levelLabels[value]}
                    </Badge>
                ) : (
                    <Badge variant="warning">
                        <ShieldAlertIcon aria-hidden="true" />
                        {auditTrailList.levelLabels[value]}
                    </Badge>
                ),
        },
        {
            title: auditTrailList.columns.actor,
            dataIndex: "actorLabel",
            render: (value: string | null) =>
                value ? (
                    <span className="block min-w-40 max-w-xs [overflow-wrap:anywhere]">
                        {value}
                    </span>
                ) : (
                    emptyCell
                ),
        },
        {
            title: auditTrailList.columns.target,
            dataIndex: "targetLabel",
            render: (value: string | null) =>
                value ? (
                    <span className="block min-w-40 max-w-xs [overflow-wrap:anywhere]">
                        {value}
                    </span>
                ) : (
                    emptyCell
                ),
        },
        {
            title: auditTrailList.columns.changedFields,
            dataIndex: "changedFields",
            render: (value: string[]) =>
                value.length > 0 ? (
                    <span
                        className="block min-w-40 max-w-sm font-mono text-muted-foreground text-xs [overflow-wrap:anywhere]"
                        translate="no"
                    >
                        {value.join(", ")}
                    </span>
                ) : (
                    emptyCell
                ),
        },
    ];

    return (
        <>
            <Header
                breadcrumbs={[
                    { label: routes.root.label, href: routes.root.url },
                ]}
                page={routes.audit.list.label}
            />
            {/* Neither the spinner nor the error may cover the filters: a filter is what
                starts each query, and unmounting the form would drop the chosen values
                and leave no way back from a combination the server refuses. */}
            <Container header={<PageHeader title={routes.audit.list.label} />}>
                <div className="flex w-full flex-col gap-6">
                    <AuditFilters onApply={setFilters} />
                    {listLoadError ? (
                        <LoadErrorState
                            message={listLoadError}
                            onRetry={() => refetch()}
                            retrying={isFetching}
                        />
                    ) : (
                        <Table<AuditEventDTO>
                            columns={columns}
                            dataSource={auditEvents}
                            hasMore={hasNextPage}
                            loading={isLoading}
                            loadMoreLoading={isFetchingNextPage}
                            locale={{ emptyText: auditTrailList.empty }}
                            onLoadMore={() => fetchNextPage()}
                            onRefresh={() => refetch()}
                            pagination={false}
                            refreshLoading={isFetching}
                            rowKey={(row) => row.id}
                            searchFields={["actorLabel", "targetLabel"]}
                            searchPlaceholder={auditTrailList.searchPlaceholder}
                        />
                    )}
                </div>
            </Container>
        </>
    );
}
