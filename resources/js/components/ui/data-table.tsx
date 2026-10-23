import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import * as React from 'react';

export interface DataTableColumn<T> {
    key: string;
    header: React.ReactNode;
    cell: (row: T, index: number) => React.ReactNode;
    align?: 'left' | 'center' | 'right';
    className?: string;
    headerClassName?: string;
}

export interface DataTablePagination {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
    onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
    columns: DataTableColumn<T>[];
    data: T[];
    rowKey: (row: T) => string | number;
    emptyState?: React.ReactNode;
    pagination?: DataTablePagination;
    rowClassName?: string;
    disabled?: boolean;
}

const alignClass = (align?: 'left' | 'center' | 'right'): string => {
    if (align === 'right') {
        return 'text-right';
    }
    if (align === 'center') {
        return 'text-center';
    }
    return '';
};

interface DataTableRowProps<T> {
    row: T;
    index: number;
    columns: DataTableColumn<T>[];
    rowClassName?: string;
}

function DataTableRowInner<T>({ row, index, columns, rowClassName }: DataTableRowProps<T>): React.ReactElement {
    return (
        <TableRow className={cn('group', rowClassName)}>
            {columns.map((col) => (
                <TableCell key={col.key} className={cn(alignClass(col.align), col.className)}>
                    {col.cell(row, index)}
                </TableCell>
            ))}
        </TableRow>
    );
}

const DataTableRow = React.memo(DataTableRowInner) as typeof DataTableRowInner;

function DataTableInner<T>({
    columns,
    data,
    rowKey,
    emptyState,
    pagination,
    rowClassName,
    disabled,
}: DataTableProps<T>): React.ReactElement {
    return (
        <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col) => (
                                <TableHead
                                    key={col.key}
                                    className={cn(alignClass(col.align), col.headerClassName)}
                                >
                                    {col.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="py-12 text-center">
                                    {emptyState ?? <span className="text-gray-400">No data</span>}
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row, idx) => (
                                <DataTableRow
                                    key={rowKey(row)}
                                    row={row}
                                    index={idx}
                                    columns={columns}
                                    rowClassName={rowClassName}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination && pagination.lastPage > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {(pagination.currentPage - 1) * pagination.perPage + 1}–
                        {Math.min(pagination.currentPage * pagination.perPage, pagination.total)} of{' '}
                        {pagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={disabled || pagination.currentPage <= 1}
                            className="border-violet-700 text-violet-700 hover:bg-violet-50 disabled:opacity-40"
                            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {pagination.currentPage} of {pagination.lastPage}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={disabled || pagination.currentPage >= pagination.lastPage}
                            className="border-violet-700 text-violet-700 hover:bg-violet-50 disabled:opacity-40"
                            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

export const DataTable = DataTableInner;
