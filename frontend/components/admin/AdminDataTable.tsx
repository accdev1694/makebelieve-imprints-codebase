'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface Column<T> {
  /** Unique key for the column - can be a property of T or a custom string */
  key: keyof T | string;
  /** Header text to display */
  header: string;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Custom render function for cell content */
  render?: (item: T, index: number) => React.ReactNode;
  /** Column width class (Tailwind) */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Whether to hide on mobile */
  hideOnMobile?: boolean;
}

export interface PaginationConfig {
  page: number;
  total: number;
  limit: number;
  totalPages: number;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface AdminDataTableProps<T> {
  /** Array of data items to display */
  data: T[];
  /** Column configuration */
  columns: Column<T>[];
  /** Loading state */
  loading?: boolean;
  /** Pagination configuration */
  pagination?: PaginationConfig;
  /** Called when page changes */
  onPageChange?: (page: number) => void;
  /** Current sort configuration */
  sort?: SortConfig;
  /** Called when sort changes */
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  /** Current search query */
  searchQuery?: string;
  /** Called when search changes */
  onSearch?: (query: string) => void;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Row click handler */
  onRowClick?: (item: T) => void;
  /** Custom actions to render for each row */
  rowActions?: (item: T) => React.ReactNode;
  /** Custom toolbar content (renders above the table) */
  toolbarContent?: React.ReactNode;
  /** Custom toolbar actions (renders on the right side of toolbar) */
  toolbarActions?: React.ReactNode;
  /** Message to show when no data is available */
  emptyMessage?: string;
  /** Content to show when no data is available (overrides emptyMessage) */
  emptyContent?: React.ReactNode;
  /** Card title */
  title?: string;
  /** Card description */
  description?: string | React.ReactNode;
  /** Unique key extractor for each item */
  keyExtractor: (item: T) => string;
  /** Whether to show the card wrapper */
  showCard?: boolean;
  /** Number of skeleton rows to show while loading */
  skeletonRows?: number;
  /** Whether to enable row hover effect */
  hoverEffect?: boolean;
  /** Custom class name for the table container */
  className?: string;
  /** Custom class name for each row */
  rowClassName?: string | ((item: T) => string);
  /** Whether to show the search input */
  showSearch?: boolean;
  /** Whether to show sort toggle button */
  showSortToggle?: boolean;
  /** Label for ascending sort */
  sortAscLabel?: string;
  /** Label for descending sort */
  sortDescLabel?: string;
  /** Bulk selection support */
  selectable?: boolean;
  /** Currently selected item keys */
  selectedKeys?: Set<string>;
  /** Called when selection changes */
  onSelectionChange?: (keys: Set<string>) => void;
  /** Bulk actions toolbar (shown when items are selected) */
  bulkActions?: (selectedCount: number) => React.ReactNode;
}

// ============================================================================
// Sub-components
// ============================================================================

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 p-4 bg-card/30 rounded-lg animate-pulse">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-5 bg-muted/30 rounded"
              style={{ width: `${Math.random() * 30 + 20}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  message,
  content,
}: {
  message: string;
  content?: React.ReactNode;
}) {
  if (content) {
    return <div className="text-center py-12">{content}</div>;
  }

  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

function Pagination({
  config,
  onPageChange,
}: {
  config: PaginationConfig;
  onPageChange: (page: number) => void;
}) {
  const { page, totalPages } = config;

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative flex-1 min-w-[200px] max-w-md">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-9"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function SortToggle({
  direction,
  onToggle,
  ascLabel,
  descLabel,
}: {
  direction: 'asc' | 'desc';
  onToggle: () => void;
  ascLabel: string;
  descLabel: string;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onToggle} className="h-10">
      {direction === 'desc' ? (
        <>
          <ArrowDown className="h-4 w-4 mr-1" /> {descLabel}
        </>
      ) : (
        <>
          <ArrowUp className="h-4 w-4 mr-1" /> {ascLabel}
        </>
      )}
    </Button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AdminDataTable<T>({
  data,
  columns,
  loading = false,
  pagination,
  onPageChange,
  sort,
  onSort,
  searchQuery = '',
  onSearch,
  searchPlaceholder = 'Search...',
  onRowClick,
  rowActions,
  toolbarContent,
  toolbarActions,
  emptyMessage = 'No items found',
  emptyContent,
  title,
  description,
  keyExtractor,
  showCard = true,
  skeletonRows = 5,
  hoverEffect = true,
  className = '',
  rowClassName,
  showSearch = true,
  showSortToggle = true,
  sortAscLabel = 'Oldest',
  sortDescLabel = 'Newest',
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
  bulkActions,
}: AdminDataTableProps<T>) {
  // Local state for controlled search input with debounce
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Handle search with debounce
  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearchQuery(value);
      onSearch?.(value);
    },
    [onSearch]
  );

  // Handle sort toggle
  const handleSortToggle = useCallback(() => {
    if (sort && onSort) {
      onSort(sort.key, sort.direction === 'desc' ? 'asc' : 'desc');
    }
  }, [sort, onSort]);

  // Handle column header click for sorting
  const handleColumnSort = useCallback(
    (column: Column<T>) => {
      if (!column.sortable || !onSort) return;

      const key = String(column.key);
      const newDirection =
        sort?.key === key && sort.direction === 'asc' ? 'desc' : 'asc';
      onSort(key, newDirection);
    },
    [sort, onSort]
  );

  // Handle row selection
  const handleRowSelect = useCallback(
    (key: string) => {
      if (!onSelectionChange) return;

      const newKeys = new Set(selectedKeys);
      if (newKeys.has(key)) {
        newKeys.delete(key);
      } else {
        newKeys.add(key);
      }
      onSelectionChange(newKeys);
    },
    [selectedKeys, onSelectionChange]
  );

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;

    if (selectedKeys.size === data.length) {
      onSelectionChange(new Set());
    } else {
      const allKeys = new Set(data.map((item) => keyExtractor(item)));
      onSelectionChange(allKeys);
    }
  }, [data, keyExtractor, selectedKeys, onSelectionChange]);

  // Get row class name
  const getRowClassName = (item: T): string => {
    const baseClass = `p-4 bg-card/30 rounded-lg transition-colors ${
      hoverEffect ? 'hover:bg-card/50' : ''
    } ${onRowClick ? 'cursor-pointer' : ''}`;

    if (typeof rowClassName === 'function') {
      return `${baseClass} ${rowClassName(item)}`;
    }
    return `${baseClass} ${rowClassName || ''}`;
  };

  // Render toolbar
  const renderToolbar = () => {
    const hasSearchOrSort =
      (showSearch && onSearch) || (showSortToggle && sort && onSort);
    const hasContent = toolbarContent || toolbarActions || hasSearchOrSort;

    if (!hasContent && !selectable) return null;

    // Show bulk actions toolbar when items are selected
    if (selectable && selectedKeys.size > 0 && bulkActions) {
      return (
        <div className="flex items-center justify-between gap-4 mb-4 p-3 bg-primary/10 rounded-lg">
          <span className="text-sm font-medium">
            {selectedKeys.size} item{selectedKeys.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            {bulkActions(selectedKeys.size)}
            <Button variant="ghost" size="sm" onClick={() => onSelectionChange?.(new Set())}>
              Clear selection
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-end gap-4 mb-4">
        {showSearch && onSearch && (
          <SearchBar
            value={localSearchQuery}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
          />
        )}
        {toolbarContent}
        <div className="flex-1" />
        {showSortToggle && sort && onSort && (
          <SortToggle
            direction={sort.direction}
            onToggle={handleSortToggle}
            ascLabel={sortAscLabel}
            descLabel={sortDescLabel}
          />
        )}
        {toolbarActions}
      </div>
    );
  };

  // Render table header
  const renderHeader = () => {
    return (
      <div className="hidden md:flex items-center gap-4 px-4 py-3 text-sm font-medium text-muted-foreground border-b border-border/50">
        {selectable && (
          <div className="w-8">
            <input
              type="checkbox"
              checked={data.length > 0 && selectedKeys.size === data.length}
              onChange={handleSelectAll}
              className="rounded border-border"
            />
          </div>
        )}
        {columns.map((column) => {
          const alignClass =
            column.align === 'right'
              ? 'text-right'
              : column.align === 'center'
                ? 'text-center'
                : 'text-left';

          const sortable = column.sortable && onSort;
          const isSorted = sort?.key === String(column.key);

          return (
            <div
              key={String(column.key)}
              className={`${column.width || 'flex-1'} ${alignClass} ${
                sortable ? 'cursor-pointer hover:text-foreground select-none' : ''
              } ${column.hideOnMobile ? 'hidden lg:block' : ''}`}
              onClick={() => sortable && handleColumnSort(column)}
            >
              <span className="inline-flex items-center gap-1">
                {column.header}
                {sortable && isSorted && (
                  <span className="text-primary">
                    {sort.direction === 'asc' ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                  </span>
                )}
              </span>
            </div>
          );
        })}
        {rowActions && <div className="w-20 text-right">Actions</div>}
      </div>
    );
  };

  // Render single row
  const renderRow = (item: T, index: number) => {
    const key = keyExtractor(item);
    const isSelected = selectedKeys.has(key);

    return (
      <div
        key={key}
        className={`${getRowClassName(item)} ${isSelected ? 'ring-2 ring-primary' : ''}`}
        onClick={() => onRowClick?.(item)}
      >
        <div className="flex items-center gap-4">
          {selectable && (
            <div className="w-8" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleRowSelect(key)}
                className="rounded border-border"
              />
            </div>
          )}
          {columns.map((column) => {
            const alignClass =
              column.align === 'right'
                ? 'text-right'
                : column.align === 'center'
                  ? 'text-center'
                  : 'text-left';

            const value = column.render
              ? column.render(item, index)
              : (item[column.key as keyof T] as React.ReactNode);

            return (
              <div
                key={String(column.key)}
                className={`${column.width || 'flex-1'} ${alignClass} ${
                  column.hideOnMobile ? 'hidden lg:block' : ''
                } min-w-0`}
              >
                {value}
              </div>
            );
          })}
          {rowActions && (
            <div
              className="w-20 text-right"
              onClick={(e) => e.stopPropagation()}
            >
              {rowActions(item)}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render content
  const renderContent = () => {
    if (loading) {
      return <TableSkeleton columns={columns.length + (rowActions ? 1 : 0)} rows={skeletonRows} />;
    }

    if (data.length === 0) {
      return <EmptyState message={emptyMessage} content={emptyContent} />;
    }

    return (
      <div className={className}>
        {renderHeader()}
        <div className="space-y-3 mt-3">
          {data.map((item, index) => renderRow(item, index))}
        </div>
        {pagination && onPageChange && (
          <Pagination config={pagination} onPageChange={onPageChange} />
        )}
      </div>
    );
  };

  // Render with or without card wrapper
  if (!showCard) {
    return (
      <>
        {renderToolbar()}
        {renderContent()}
      </>
    );
  }

  return (
    <>
      {renderToolbar()}
      <Card className="card-glow">
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && (
              <CardDescription>
                {typeof description === 'string' ? description : description}
              </CardDescription>
            )}
          </CardHeader>
        )}
        <CardContent>{renderContent()}</CardContent>
      </Card>
    </>
  );
}

// ============================================================================
// Utility Types for easier usage
// ============================================================================

export type { Column as AdminDataTableColumn };
export type { PaginationConfig as AdminDataTablePagination };
export type { SortConfig as AdminDataTableSort };

// ============================================================================
// Helper function to create columns with type inference
// ============================================================================

export function createColumns<T>(columns: Column<T>[]): Column<T>[] {
  return columns;
}

export default AdminDataTable;
