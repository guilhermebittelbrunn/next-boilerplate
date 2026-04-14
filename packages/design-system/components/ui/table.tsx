import { cn } from '@repo/design-system/lib/utils';
import { Table as AntdTable, TableProps as AntdTableProps } from 'antd';
import { ColumnType } from 'antd/es/table';
import { useMemo } from 'react';

export interface TableProps<T> extends Omit<AntdTableProps<T>, 'columns'> {
  columns: Omit<ColumnType<T>, 'key'>[];
}


export function Table<T>({ columns, className, onChange, ...props }: TableProps<T>) {
  const columnsWithKey = useMemo(() => columns.map((column) => ({ ...column, key: column.dataIndex })), [columns]);

  return <AntdTable className={cn('w-full', className)} columns={columns} {...props} onChange={onChange} />;
}
