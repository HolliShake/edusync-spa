import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TableColumn<TRow extends Record<string, unknown>> {
    header: string;
    accessor: string;
    render?: (value: unknown, row: TRow) => ReactNode;
}

export interface TableProps<TRow extends Record<string, unknown>> {
    columns: TableColumn<TRow>[];
    data: TRow[];
    isLoading?: boolean;
    totalPage: number;
    rows: number;
    page: number;
    onPageChange: (page: number) => void;
    emptyMessage?: string;
}

const getNestedValue = (row: Record<string, unknown>, accessor: string): unknown => {
    return accessor
        .split('.')
        .reduce<unknown>((currentValue, currentKey) => {
            if (currentValue === null || currentValue === undefined || typeof currentValue !== 'object') {
                return undefined;
            }

            return (currentValue as Record<string, unknown>)[currentKey];
        }, row);
};

export default function DataTable<TRow extends Record<string, unknown>>({
    columns,
    data,
    isLoading = false,
    totalPage,
    rows,
    page,
    onPageChange,
    emptyMessage = 'No data found.',
}: TableProps<TRow>): ReactNode {
    const loadingRows = rows || 5;

    return (
        <div className="flex flex-col gap-2">
            <div className="min-w-0 overflow-auto rounded-md border">
                <Table className="w-full min-w-max">
                    <TableHeader>
                        <TableRow>
                            {columns.map((column) => (
                                <TableHead key={column.header}>
                                    {column.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading &&
                            Array.from({ length: loadingRows }).map((_, rowIndex) => (
                                <TableRow key={`loading-${rowIndex}`}>
                                    {columns.map((column) => (
                                        <TableCell key={`loading-${rowIndex}-${column.header}`}>
                                            <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}

                        {!isLoading && data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                                    {emptyMessage}
                                </TableCell>
                            </TableRow>
                        )}

                        {!isLoading &&
                            data.map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {columns.map((column) => {
                                        const value = getNestedValue(row, column.accessor);

                                        return (
                                            <TableCell key={`${rowIndex}-${column.header}`}>
                                                {column.render ? column.render(value, row) : (value as ReactNode) ?? '—'}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    disabled={page <= 1 || isLoading}
                    onClick={() => onPageChange(page - 1)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPage}
                </span>
                <Button
                    variant="outline"
                    size="icon"
                    disabled={page >= totalPage || isLoading}
                    onClick={() => onPageChange(page + 1)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}