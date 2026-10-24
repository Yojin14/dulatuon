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

/**
 * Phone layout for one row: the first column is the card title, an "actions" column sits in
 * the corner, and every other column becomes a labelled line, so nothing scrolls sideways.
 */
function DataTableCard<T>({ row, index, columns }: { row: T; index: number; columns: DataTableColumn<T>[] }): React.ReactElement {
    const [first, ...rest] = columns;
    const actions = rest.find((col) => col.key === 'actions');
    const details = rest.filter((col) => col !== actions);

    return (
        <li className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">{first?.cell(row, index)}</div>
                {actions && <div className="-mt-1 -mr-1 shrink-0">{actions.cell(row, index)}</div>}
            </div>
            {details.length > 0 && (
                <dl className="mt-3 grid gap-2 border-t pt-3 text-sm">
                    {details.map((col) => (
                        <div key={col.key} className="flex items-center justify-between gap-3">
                            <dt className="shrink-0 text-xs font-semibold text-muted-foreground">{col.header}</dt>
                            <dd className="flex min-w-0 flex-wrap justify-end gap-1 text-right">{col.cell(row, index)}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </li>
    );
}

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
            {/* Phones: one card per row */}
            <ul className="grid gap-2 md:hidden">
                {data.length === 0 ? (
                    <li className="rounded-2xl border bg-card px-4 py-10 text-center">
                        {emptyState ?? <span className="text-muted-foreground">No data</span>}
                    </li>
                ) : (
                    data.map((row, idx) => <DataTableCard key={rowKey(row)} row={row} index={idx} columns={columns} />)
                )}
            </ul>

            <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
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
                                    {emptyState ?? <span className="text-muted-foreground">No data</span>}
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
                <div className="flex flex-wrap items-center justify-between gap-3">
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
                            className="disabled:opacity-40"
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
                            className="disabled:opacity-40"
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
