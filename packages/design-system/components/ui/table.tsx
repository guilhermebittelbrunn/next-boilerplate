"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { getDictionary } from "@repo/internationalization/client";
import { cn } from "@repo/design-system/lib/utils";
import { Table as AntdTable, TableProps as AntdTableProps } from "antd";
import type { ColumnType } from "antd/es/table";
import { useMemo, useState } from "react";

export interface TableProps<T extends object = Record<string, unknown>>
  extends Omit<AntdTableProps<T>, "columns" | "dataSource"> {
  columns: Omit<ColumnType<T>, "key">[];
  dataSource?: readonly T[] | T[];
  /** When set, shows a search field and filters rows by these keys (string values, case-insensitive). */
  searchFields?: string[];
  searchPlaceholder?: string;
  /** Optional refresh action (e.g. refetch query). */
  onRefresh?: () => void;
  refreshLoading?: boolean;
  refreshLabel?: string;
}

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
      loading={loading}
      onClick={onClick}
      type="button"
      variant="outline"
    >
      {label}
    </Button>
  );
}

export function Table<T extends Record<string, unknown>>({
  columns,
  className,
  onChange,
  searchFields,
  searchPlaceholder,
  onRefresh,
  refreshLoading,
  refreshLabel,
  dataSource,
  ...rest
}: TableProps<T>) {
  const { dictionary } = getDictionary();
  const tableCopy = dictionary.components.table;
  const [search, setSearch] = useState("");

  const columnsWithKey = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        key: String(column.dataIndex),
      })),
    [columns]
  );

  const filteredDataSource = useMemo(() => {
    if (!dataSource) {
      return dataSource;
    }
    if (!searchFields?.length) {
      return [...dataSource];
    }
    const query = search.trim().toLowerCase();
    if (!query) {
      return [...dataSource];
    }
    return dataSource.filter((row) => {
      const record = row as Record<string, unknown>;
      return searchFields.some((field) => {
        const value = record[field];
        return String(value ?? "")
          .toLowerCase()
          .includes(query);
      });
    });
  }, [dataSource, search, searchFields]);

  const showToolbar = Boolean(
    (searchFields && searchFields.length > 0) || onRefresh
  );

  return (
    <div className="flex w-full flex-col gap-3">
      {showToolbar ? (
        <div
          className={cn(
            "flex flex-col gap-3 sm:flex-row sm:items-center",
            searchFields?.length
              ? "sm:justify-between"
              : "sm:justify-end"
          )}
        >
          {searchFields && searchFields.length > 0 ? (
            <Input
              className="max-w-md bg-background"
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                searchPlaceholder ?? tableCopy.searchPlaceholder
              }
              value={search}
            />
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
      <AntdTable<T>
        className={cn("w-full", className)}
        columns={columnsWithKey}
        dataSource={filteredDataSource}
        onChange={onChange}
        {...rest}
      />
    </div>
  );
}
