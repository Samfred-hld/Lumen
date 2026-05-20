import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MsIcon from '@/components/ui/ms-icon';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/financeUtils';
import { useTransactions, useBudgets, useGoals, useCards } from '@/hooks/useData';
import { getRules } from '@/lib/store/rules';

const GROUP_LABELS = {
  transactions: 'Transações',
  budgets: 'Orçamentos',
  goals: 'Metas',
  cards: 'Cartões',
  rules: 'Regras',
};

const GROUP_ICONS = {
  transactions: 'receipt_long',
  budgets: 'account_balance',
  goals: 'flag',
  cards: 'credit_card',
  rules: 'auto_fix_high',
};

const GROUP_ORDER = ['transactions', 'budgets', 'goals', 'cards', 'rules'];
const MAX_PER_GROUP = 3;

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  const { data: transactions = [] } = useTransactions(500);
  const { data: budgets = [] } = useBudgets();
  const { data: goals = [] } = useGoals();
  const { data: cards = [] } = useCards();
  const rules = useMemo(() => getRules(), []);

  // Debounce query — triggers after 2 characters with 300ms delay
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setDebouncedQuery('');
      return;
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Grouped search results
  const { groups, flatResults } = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    const isRecent = !debouncedQuery;

    const g = {};

    // Transactions
    const txResults = isRecent
      ? transactions.slice(0, MAX_PER_GROUP)
      : transactions.filter(t =>
          t.description?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q)
        );
    if (txResults.length > 0) {
      g.transactions = { items: txResults, total: txResults.length, hasMore: !isRecent && txResults.length > MAX_PER_GROUP };
    }

    // Budgets
    if (!isRecent) {
      const budgetResults = budgets.filter(b =>
        b.category?.toLowerCase().includes(q)
      );
      if (budgetResults.length > 0) {
        g.budgets = { items: budgetResults, total: budgetResults.length, hasMore: budgetResults.length > MAX_PER_GROUP };
      }
    }

    // Goals
    if (!isRecent) {
      const goalResults = goals.filter(g =>
        g.name?.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q) ||
        g.icon?.toLowerCase().includes(q)
      );
      if (goalResults.length > 0) {
        g.goals = { items: goalResults, total: goalResults.length, hasMore: goalResults.length > MAX_PER_GROUP };
      }
    }

    // Cards
    if (!isRecent) {
      const cardResults = cards.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.brand?.toLowerCase().includes(q)
      );
      if (cardResults.length > 0) {
        g.cards = { items: cardResults, total: cardResults.length, hasMore: cardResults.length > MAX_PER_GROUP };
      }
    }

    // Rules
    if (!isRecent) {
      const ruleResults = rules.filter(r =>
        r.keyword?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q)
      );
      if (ruleResults.length > 0) {
        g.rules = { items: ruleResults, total: ruleResults.length, hasMore: ruleResults.length > MAX_PER_GROUP };
      }
    }

    // Build flat list for keyboard navigation
    const flat = [];
    for (const key of GROUP_ORDER) {
      if (g[key]) {
        for (const item of g[key].items.slice(0, MAX_PER_GROUP)) {
          flat.push({ ...item, _group: key });
        }
      }
    }

    return { groups: g, flatResults: flat };
  }, [debouncedQuery, transactions, budgets, goals, cards, rules]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [debouncedQuery]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatResults[selectedIdx]) {
      e.preventDefault();
      handleSelect(flatResults[selectedIdx]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (item) => {
    if (!item) return;
    const group = item._group;

    if (group === 'transactions') {
      if (!item.date) return;
      const [year, month] = item.date.split('-');
      navigate(`/transactions?month=${month}&year=${year}`);
    } else if (group === 'budgets') {
      navigate('/planejamento');
    } else if (group === 'goals') {
      navigate('/goals');
    } else if (group === 'cards') {
      navigate('/settings');
    } else if (group === 'rules') {
      navigate('/settings');
    }
    onClose();
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.querySelector(`[data-flat-idx="${selectedIdx}"]`);
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIdx]);

  const typeIcon = (type) => {
    if (type === 'income') return <MsIcon name="trending_up" size={14} className="text-emerald-500" />;
    if (type === 'expense') return <MsIcon name="trending_down" size={14} className="text-red-500" />;
    return <MsIcon name="diamond" size={14} className="text-violet-500" />;
  };

  const renderTransaction = (tx, flatIdx) => (
    <button
      key={`tx-${tx.id}`}
      data-flat-idx={flatIdx}
      onClick={() => handleSelect({ ...tx, _group: 'transactions' })}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
        flatIdx === selectedIdx ? "bg-primary/10" : "hover:bg-muted/50"
      )}
      role="option"
      aria-selected={flatIdx === selectedIdx}
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
    </button>
  );

  const renderBudget = (budget, flatIdx) => (
    <button
      key={`budget-${budget.id}`}
      data-flat-idx={flatIdx}
      onClick={() => handleSelect({ ...budget, _group: 'budgets' })}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
        flatIdx === selectedIdx ? "bg-primary/10" : "hover:bg-muted/50"
      )}
      role="option"
      aria-selected={flatIdx === selectedIdx}
    >
      <div className="shrink-0"><MsIcon name="account_balance" size={14} className="text-blue-500" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{budget.category}</p>
        <p className="text-xs text-muted-foreground">
          Limite: {formatCurrency(budget.limit)} · {budget.month}
        </p>
      </div>
    </button>
  );

  const renderGoal = (goal, flatIdx) => {
    const pct = goal.targetValue > 0 ? Math.min(100, ((goal.currentValue || 0) / goal.targetValue) * 100) : 0;
    return (
      <button
        key={`goal-${goal.id}`}
        data-flat-idx={flatIdx}
        onClick={() => handleSelect({ ...goal, _group: 'goals' })}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
          flatIdx === selectedIdx ? "bg-primary/10" : "hover:bg-muted/50"
        )}
        role="option"
        aria-selected={flatIdx === selectedIdx}
      >
        <div className="shrink-0"><MsIcon name="flag" size={14} className="text-amber-500" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{goal.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(goal.targetValue)} · {Math.round(pct)}% concluído
          </p>
        </div>
      </button>
    );
  };

  const renderCard = (card, flatIdx) => (
    <button
      key={`card-${card.id}`}
      data-flat-idx={flatIdx}
      onClick={() => handleSelect({ ...card, _group: 'cards' })}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
        flatIdx === selectedIdx ? "bg-primary/10" : "hover:bg-muted/50"
      )}
      role="option"
      aria-selected={flatIdx === selectedIdx}
    >
      <div className="shrink-0"><MsIcon name="credit_card" size={14} className="text-violet-500" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{card.name}</p>
        <p className="text-xs text-muted-foreground">
          {card.brand || '—'}{card.last4 ? ` ···· ${card.last4}` : ''}
        </p>
      </div>
    </button>
  );

  const renderRule = (rule, flatIdx) => (
    <button
      key={`rule-${rule.id}`}
      data-flat-idx={flatIdx}
      onClick={() => handleSelect({ ...rule, _group: 'rules' })}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
        flatIdx === selectedIdx ? "bg-primary/10" : "hover:bg-muted/50"
      )}
      role="option"
      aria-selected={flatIdx === selectedIdx}
    >
      <div className="shrink-0"><MsIcon name="auto_fix_high" size={14} className="text-cyan-500" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{rule.keyword}</p>
        <p className="text-xs text-muted-foreground">
          {rule.category}
        </p>
      </div>
    </button>
  );

  const renderers = {
    transactions: renderTransaction,
    budgets: renderBudget,
    goals: renderGoal,
    cards: renderCard,
    rules: renderRule,
  };

  if (!open) return null;

  let flatIdx = -1;

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
          <MsIcon name="search" size={18} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar..."
            className="flex-1 py-3.5 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono border">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-1" role="listbox">
          {flatResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {debouncedQuery ? 'Nenhum resultado encontrado' : 'Nenhuma transação recente'}
            </div>
          ) : (
            GROUP_ORDER.map(groupKey => {
              const group = groups[groupKey];
              if (!group) return null;
              const visible = group.items.slice(0, MAX_PER_GROUP);
              return (
                <div key={groupKey}>
                  <div className="px-4 pt-2 pb-1 flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-muted-foreground flex items-center gap-1.5">
                      <MsIcon name={GROUP_ICONS[groupKey]} size={12} />
                      {GROUP_LABELS[groupKey]}
                    </span>
                    {group.hasMore && (
                      <span className="text-[10px] text-muted-foreground">
                        +{group.total - MAX_PER_GROUP} mais
                      </span>
                    )}
                  </div>
                  {visible.map(item => {
                    flatIdx++;
                    return renderers[groupKey](item, flatIdx);
                  })}
                </div>
              );
            })
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
