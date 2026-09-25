"use client";

import { Table } from "@repo/design-system/components/ui";
import { getDictionary } from "@repo/internationalization/client";
import type { AuditAction, AuditEventDTO } from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useState } from "react";
import { Container } from "@/shared/components/ui/Container";
import { Header } from "@/shared/components/ui/Header";
import { LoadErrorState } from "@/shared/components/ui/LoadErrorState";
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

    const columns = [
        {
            title: auditTrailList.columns.createdAt,
            dataIndex: "createdAt",
            render: (value: string) => formatDateTime(value),
        },
        {
            title: auditTrailList.columns.action,
            dataIndex: "action",
            render: (value: AuditAction) => (
                <span className="font-medium">
                    {auditTrailList.actionLabels[value]}
                </span>
            ),
        },
        {
            title: auditTrailList.columns.actor,
            dataIndex: "actorLabel",
            render: (value: string | null) =>
                value ?? auditTrailList.emptyValue,
        },
        {
            title: auditTrailList.columns.target,
            dataIndex: "targetLabel",
            render: (value: string | null) =>
                value ?? auditTrailList.emptyValue,
        },
        {
            title: auditTrailList.columns.changedFields,
            dataIndex: "changedFields",
            render: (value: string[]) =>
                value.length > 0 ? value.join(", ") : auditTrailList.emptyValue,
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
            <Container>
                <div className="mx-auto flex w-full flex-col gap-4">
                    <AuditFilters onApply={setFilters} />
                    {listLoadError ? (
                        <LoadErrorState message={listLoadError} />
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
