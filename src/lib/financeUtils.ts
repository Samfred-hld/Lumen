// ══════════════════════════════════════════
// LÚMEN — Finance Utilities
// ══════════════════════════════════════════

// Re-export category constants/functions from canonical source
export { CAT_COLORS, MONTH_NAMES, MONTH_SHORT, DAY_NAMES, getCategories } from './categories';
import { DEFAULT_CATEGORIES as _DC, MONTH_SHORT } from './categories';
import { format, subMonths, getDaysInMonth as dfGetDaysInMonth, startOfMonth } from 'date-fns';
export const DEFAULT_CATEGORIES = _DC;
export const CATEGORIES = _DC;

type Transaction = Record<string, any>;
type Budget = Record<string, any>;
type Goal = Record<string, any>;

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function getCurrentMonthKey(): string {
  return format(new Date(), 'yyyy-MM');
}

export function getMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const toMonthKey = (date: Date): string => getMonthKey(date.getFullYear(), date.getMonth());

export function filterByMonth(transactions: Transaction[], year: number, month: number): Transaction[] {
  const prefix = getMonthKey(year, month);
  return transactions.filter(t => {
    if (t.invoiceMonth) return t.invoiceMonth === prefix; // cartão: mês da fatura
    return t.date && t.date.startsWith(prefix); // demais: data da compra
  });
}

export function calcTotals(transactions: Transaction[]): { income: number; expense: number; investment: number; creditCard: number; balance: number } {
  let income = 0, expense = 0, investment = 0, creditCard = 0;
  transactions.forEach(t => {
    if (t.type === 'income') income += t.value || 0;
    else if (t.type === 'expense') {
      expense += t.value || 0;
      if (t.invoiceMonth || t.paymentMethod === 'Crédito' || t.cardId) {
        creditCard += t.value || 0;
      }
    }
    else if (t.type === 'investment') investment += t.value || 0;
  });
  return { income, expense, investment, creditCard, balance: income - expense - investment };
}

export function groupByCategory(transactions: Transaction[]): [string, number][] {
  const map: Record<string, number> = {};
  transactions.forEach(t => {
    const cat: string = t.category || 'Outros';
    map[cat] = (map[cat] || 0) + (t.value || 0);
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export function getGoalProgress(goal: Goal, transactions: Transaction[]): number {
  const mode = goal.progressMode || 'linked';
  if (mode === 'manual') {
    return goal.currentValue || 0;
  }
  if (!transactions) return 0;
  // linked mode: sum transactions linked to this goal
  return transactions
    .filter(t => t.goalId === goal.id)
    .reduce((sum, t) => sum + (t.value || 0), 0);
}

export function getBudgetUsed(budget: Budget, transactions: Transaction[]): number {
  return transactions
    .filter(t =>
      t.type === 'expense' &&
      t.category === budget.category &&
      t.date && t.date.startsWith(budget.month)
    )
    .reduce((sum, t) => sum + (t.value || 0), 0);
}

export function getTypeLabel(type: string): string {
  if (type === 'income') return 'Receita';
  if (type === 'expense') return 'Despesa';
  if (type === 'investment') return 'Investimento';
  return type;
}

export function getTypeColor(type: string): string {
  if (type === 'income') return 'text-emerald-600';
  if (type === 'expense') return 'text-red-500';
  if (type === 'investment') return 'text-violet-500';
  return 'text-muted-foreground';
}

export function getTypeBg(type: string): string {
  if (type === 'income') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (type === 'expense') return 'bg-red-50 text-red-700 border-red-200';
  if (type === 'investment') return 'bg-violet-50 text-violet-700 border-violet-200';
  return 'bg-muted text-muted-foreground';
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function getDaysInMonth(year: number, month: number): number {
  return dfGetDaysInMonth(new Date(year, month));
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function getLast6Months(): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

// ── Smart date formatter ──
export function formatSmartDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  const [y, m, d] = dateStr.split('-');
  const monthShort = MONTH_SHORT[parseInt(m) - 1];
  const day = parseInt(d);

  if (dateStr === todayStr) return `Hoje, ${day} ${monthShort}`;
  if (dateStr === yesterdayStr) return `Ontem, ${day} ${monthShort}`;
  return `${day} ${monthShort}`;
}

export function clampDateInput(value: string | null | undefined): string | null | undefined {
  if (!value) return value;
  const parts = value.split('-');
  if (parts[0] && parts[0].length > 4) {
    parts[0] = parts[0].slice(0, 4);
  }
  if (parts[0]) {
    const year = parseInt(parts[0]);
    if (!isNaN(year) && year > 2099) parts[0] = '2099';
    if (!isNaN(year) && year < 1900) parts[0] = '1900';
  }
  return parts.join('-');
}

export function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return dateStr === todayStr;
}
