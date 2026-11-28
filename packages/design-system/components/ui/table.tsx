"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/design-system/components/ui/native-select";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
  RotateCwIcon,
  SearchIcon,
} from "lucide-react";
import { type Key, type ReactNode, useId, useMemo, useState } from "react";

export type TableAlign = "left" | "center" | "right";

export interface TableColumn<T> {
  title?: ReactNode;
  dataIndex: string;
  key?: string;
  // biome-ignore lint/suspicious/noExplicitAny: each column picks its own cell type
  render?: (value: any, record: T, index: number) => ReactNode;
  align?: TableAlign;
  width?: number | string;
  className?: string;
}

export type TablePagination =
  | false
  | {
      pageSize?: number;
      showSizeChanger?: boolean;
      hideOnSinglePage?: boolean;
      pageSizeOptions?: number[];
    };

export interface TableProps<T extends object = Record<string, unknown>> {
  columns: TableColumn<T>[];
  dataSource?: readonly T[] | T[];
  rowKey?: string | ((row: T) => Key);
  loading?: boolean;
  locale?: { emptyText?: ReactNode };
  pagination?: TablePagination;
  className?: string;
  /** `flush` drops the card surface, for a table that already sits inside a card. */
  variant?: "card" | "flush";
  /** When set, shows a search field and filters rows by these keys (string values, case-insensitive). */
  searchFields?: string[];
  searchPlaceholder?: string;
  /** Optional refresh action (e.g. refetch query). */
  onRefresh?: () => void;
  refreshLoading?: boolean;
  refreshLabel?: string;
  /** Server-driven paging: renders a button under the table while more pages exist. */
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadMoreLoading?: boolean;
  loadMoreLabel?: string;
}

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50];
const SKELETON_ROWS = 5;

const alignClass: Record<TableAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function TableRefreshButton({
  onClick,
  loading,
  label,
  className,
}: {
  onClick: () => void;
  loading?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <Button
      className={className}
      disabled={loading}
      onClick={onClick}
      type="button"
      variant="outline"
    >
      <RotateCwIcon
        aria-hidden="true"
        className={cn(loading && "animate-spin")}
      />
      {label}
    </Button>
  );
}

function resolveRowKey<T extends object>(
  row: T,
  index: number,
  rowKey: TableProps<T>["rowKey"]
): Key {
  if (typeof rowKey === "function") {
    return rowKey(row);
  }
  const record = row as Record<string, unknown>;
  const value = record[rowKey ?? "key"] ?? record.id;
  return value === undefined || value === null ? index : String(value);
}

export function Table<T extends Record<string, unknown>>({
  columns,
  className,
  searchFields,
  searchPlaceholder,
  onRefresh,
  refreshLoading,
  refreshLabel,
  onLoadMore,
  hasMore,
  loadMoreLoading,
  loadMoreLabel,
  dataSource,
  locale,
  loading,
  pagination,
  rowKey,
  variant = "card",
}: TableProps<T>) {
  const { dictionary } = getDictionary();
  const tableCopy = dictionary.components.table;
  const searchId = useId();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageConfig = pagination === false ? null : (pagination ?? {});
  const configuredPageSize = pageConfig?.pageSize ?? DEFAULT_PAGE_SIZE;
  const [pageSize, setPageSize] = useState(configuredPageSize);
  const [appliedPageSize, setAppliedPageSize] = useState(configuredPageSize);
  if (configuredPageSize !== appliedPageSize) {
    setAppliedPageSize(configuredPageSize);
    setPageSize(configuredPageSize);
    setPage(1);
  }

  const filteredRows = useMemo(() => {
    const rows = [...(dataSource ?? [])];
    const query = search.trim().toLowerCase();
    if (!(searchFields?.length && query)) {
      return rows;
    }
    return rows.filter((row) =>
      searchFields.some((field) =>
        String((row as Record<string, unknown>)[field] ?? "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [dataSource, search, searchFields]);

  const pageCount = pageConfig
    ? Math.max(1, Math.ceil(filteredRows.length / pageSize))
    : 1;
  const currentPage = Math.min(page, pageCount);
  const visibleRows = pageConfig
    ? filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredRows;

  const showToolbar = Boolean(searchFields?.length || onRefresh);
  // The search only sees the rows already fetched, so an empty result while pages are
  // still pending does not mean the record is absent — saying "nothing here" would be
  // false.
  const searchMissesPendingPages = Boolean(
    searchFields?.length && search.trim() && hasMore
  );
  const emptyText = searchMissesPendingPages
    ? tableCopy.searchPendingPages
    : locale?.emptyText;

  const pageSizeOptions =
    pageConfig?.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS;
  const singlePageLimit = pageConfig?.showSizeChanger
    ? Math.min(configuredPageSize, ...pageSizeOptions)
    : pageSize;
  const showPager =
    pageConfig !== null &&
    filteredRows.length > 0 &&
    !(pageConfig.hideOnSinglePage && filteredRows.length <= singlePageLimit);
  const showSkeleton = Boolean(loading) && filteredRows.length === 0;

  return (
    <div
      className={cn("flex w-full flex-col gap-3", className)}
      data-slot="table-root"
    >
      {showToolbar ? (
        <div
          className={cn(
            "flex flex-col gap-2 sm:flex-row sm:items-center",
            searchFields?.length ? "sm:justify-between" : "sm:justify-end"
          )}
        >
          {searchFields?.length ? (
            <div className="relative w-full sm:max-w-sm">
              <label className="sr-only" htmlFor={searchId}>
                {tableCopy.searchLabel}
              </label>
              <SearchIcon
                aria-hidden="true"
                className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground"
              />
              <input
                autoComplete="off"
                className="h-9 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
                data-slot="table-search"
                id={searchId}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder ?? tableCopy.searchPlaceholder}
                spellCheck={false}
                type="search"
                value={search}
              />
            </div>
          ) : null}
          {onRefresh ? (
            <TableRefreshButton
              label={refreshLabel ?? tableCopy.refresh}
              loading={refreshLoading}
              onClick={onRefresh}
            />
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "relative overflow-hidden rounded-xl",
          variant === "card"
            ? "bg-card shadow-card"
            : "shadow-[inset_0_0_0_1px_var(--border)]"
        )}
        data-slot="table-container"
      >
        <div className="overflow-x-auto overscroll-x-contain">
          <table
            aria-busy={loading || undefined}
            className="w-full caption-bottom border-collapse text-sm tabular-nums"
            data-slot="table"
          >
            <thead className="bg-muted/60">
              <tr className="border-border border-b">
                {columns.map((column) => (
                  <th
                    className={cn(
                      "h-10 whitespace-nowrap px-4 font-medium text-muted-foreground text-xs",
                      alignClass[column.align ?? "left"],
                      column.className
                    )}
                    key={column.key ?? column.dataIndex}
                    scope="col"
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              className={cn(
                "divide-y divide-border transition-opacity duration-(--duration-fast)",
                loading && !showSkeleton && "opacity-60"
              )}
            >
              {showSkeleton
                ? Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: placeholder rows have no identity
                    <tr key={rowIndex}>
                      {columns.map((column) => (
                        <td className="h-12 px-4" key={column.key ?? column.dataIndex}>
                          <Skeleton className="h-4 w-full max-w-40" />
                        </td>
                      ))}
                    </tr>
                  ))
                : null}
              {!showSkeleton && visibleRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-12" colSpan={columns.length}>
                    <div className="flex flex-col items-center gap-3 text-center">
                      <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <InboxIcon aria-hidden="true" className="size-5" />
                      </span>
                      <p className="max-w-sm text-muted-foreground text-sm">
                        {emptyText}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
              {showSkeleton
                ? null
                : visibleRows.map((row, rowIndex) => (
                    <tr
                      className="transition-colors hover:bg-accent/50"
                      data-slot="table-row"
                      key={resolveRowKey(row, rowIndex, rowKey)}
                    >
                      {columns.map((column) => {
                        const value = (row as Record<string, unknown>)[
                          column.dataIndex
                        ];
                        return (
                          <td
                            className={cn(
                              "h-12 px-4 py-2 align-middle",
                              alignClass[column.align ?? "left"],
                              column.className
                            )}
                            key={column.key ?? column.dataIndex}
                          >
                            {column.render
                              ? column.render(value, row, rowIndex)
                              : (value as ReactNode)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {loading ? (
          <span className="sr-only" role="status">
            {tableCopy.loading}
          </span>
        ) : null}
      </div>

      {showPager ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-muted-foreground text-sm">
          {pageConfig?.showSizeChanger ? (
            <label className="flex items-center gap-2">
              <span>{tableCopy.rowsPerPage}</span>
              <NativeSelect
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                size="sm"
                value={pageSize}
              >
                {pageSizeOptions.map((option) => (
                  <NativeSelectOption key={option} value={option}>
                    {option}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <span aria-live="polite" className="tabular-nums">
              {tableCopy.pageStatus
                .replace("{page}", String(currentPage))
                .replace("{total}", String(pageCount))}
            </span>
            <Button
              aria-label={tableCopy.previousPage}
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <Button
              aria-label={tableCopy.nextPage}
              disabled={currentPage >= pageCount}
              onClick={() => setPage(currentPage + 1)}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      {onLoadMore && hasMore ? (
        <div className="flex justify-center">
          <Button
            disabled={loadMoreLoading}
            loading={loadMoreLoading}
            onClick={onLoadMore}
            type="button"
            variant="outline"
          >
            {loadMoreLabel ?? tableCopy.loadMore}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
