import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRight, TrendingUp, TrendingDown, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/financeUtils';

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 500),
    enabled: open,
  });

  const results = query.trim().length < 2
    ? transactions.slice(0, 8) // show recent when no query
    : transactions.filter(t =>
        t.description?.toLowerCase().includes(query.toLowerCase()) ||
        t.category?.toLowerCase().includes(query.toLowerCase()) ||
        t.notes?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 12);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault();
      handleSelect(results[selectedIdx]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (tx) => {
    if (!tx?.date) return;
    const [year, month] = tx.date.split('-');
    navigate(`/transactions?month=${month}&year=${year}`);
    onClose();
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[selectedIdx];
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIdx]);

  const typeIcon = (type) => {
    if (type === 'income') return <TrendingUp size={14} className="text-emerald-500" />;
    if (type === 'expense') return <TrendingDown size={14} className="text-red-500" />;
    return <Gem size={14} className="text-violet-500" />;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Search box */}
      <div
        className="relative w-full max-w-lg mx-4 bg-card rounded shadow-2xl border overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 border-b">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar transações..."
            className="flex-1 py-3.5 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono border">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-1" role="listbox">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma transação encontrada
            </div>
          ) : (
            results.map((tx, i) => (
              <button
                key={tx.id}
                onClick={() => handleSelect(tx)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  i === selectedIdx ? "bg-primary/10" : "hover:bg-muted/50"
                )}
                role="option"
                aria-selected={i === selectedIdx}
              >
                <div className="shrink-0">{typeIcon(tx.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(tx.date)} · {tx.category || '—'}
                  </p>
                </div>
                <span className={cn(
                  "text-sm font-semibold tabular-nums shrink-0",
                  tx.type === 'income' ? 'text-emerald-600' : tx.type === 'expense' ? 'text-red-500' : 'text-violet-600'
                )}>
                  {tx.type !== 'income' ? '-' : '+'}{formatCurrency(tx.value)}
                </span>
                <ArrowRight size={12} className="text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100" />
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t text-[10px] text-muted-foreground">
          <span><kbd className="px-1 py-0.5 rounded bg-muted border font-mono">↑↓</kbd> navegar</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border font-mono">Enter</kbd> selecionar</span>
          <span><kbd className="px-1 py-0.5 rounded bg-muted border font-mono">Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}
