// ══════════════════════════════════════════
// LÚMEN — Pagination Component
// ══════════════════════════════════════════
// Reusable pagination for lists.

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Pagination({ page, totalPages, onPageChange, className }) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onPageChange(1)}
        disabled={page === 1}
        aria-label="Primeira página"
      >
        <ChevronsLeft size={14} />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft size={14} />
      </Button>
      {getVisiblePages().map(p => (
        <Button
          key={p}
          variant={p === page ? 'default' : 'outline'}
          size="sm"
          className="h-8 w-8 p-0 text-xs"
          onClick={() => onPageChange(p)}
          aria-label={`Página ${p}`}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </Button>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Próxima página"
      >
        <ChevronRight size={14} />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onPageChange(totalPages)}
        disabled={page === totalPages}
        aria-label="Última página"
      >
        <ChevronsRight size={14} />
      </Button>
    </div>
  );
}

/**
 * Hook for pagination state
 */
export function usePagination(items, pageSize = 20) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.ceil(items.length / pageSize);
  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

  // Reset to page 1 when items change significantly
  React.useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [totalPages]);

  return { page, setPage, totalPages, paginatedItems, total: items.length };
}
