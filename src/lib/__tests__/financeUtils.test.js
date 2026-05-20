import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  getCurrentMonthKey,
  getMonthKey,
  todayISO,
  toMonthKey,
  filterByMonth,
  calcTotals,
  groupByCategory,
  getGoalProgress,
  getBudgetUsed,
  getTypeLabel,
  getTypeColor,
  getTypeBg,
  generateId,
  getDaysInMonth,
  getFirstDayOfMonth,
  getLast6Months,
  formatSmartDate,
  clampDateInput,
  isToday,
} from '@/lib/financeUtils';

describe('formatCurrency', () => {
  it('formats 0 as "R$ 0,00"', () => {
    expect(formatCurrency(0)).toBe('R$\u00a00,00');
  });
  it('formats 1234.56 as "R$ 1.234,56"', () => {
    expect(formatCurrency(1234.56)).toBe('R$\u00a01.234,56');
  });
  it('formats negative -50 as "-R$ 50,00"', () => {
    expect(formatCurrency(-50)).toBe('-R$\u00a050,00');
  });
  it('formats null/undefined as "R$ 0,00"', () => {
    expect(formatCurrency(null)).toBe('R$\u00a00,00');
    expect(formatCurrency(undefined)).toBe('R$\u00a00,00');
  });
});

describe('formatDate', () => {
  it('converts YYYY-MM-DD to DD/MM/YYYY', () => {
    expect(formatDate('2024-03-15')).toBe('15/03/2024');
  });
  it('returns "-" for empty string', () => {
    expect(formatDate('')).toBe('-');
  });
  it('returns "-" for null/undefined', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
  });
});

describe('getCurrentMonthKey', () => {
  it('returns YYYY-MM format', () => {
    const key = getCurrentMonthKey();
    expect(key).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('getMonthKey', () => {
  it('(2024, 0) returns "2024-01"', () => {
    expect(getMonthKey(2024, 0)).toBe('2024-01');
  });
  it('(2023, 11) returns "2023-12"', () => {
    expect(getMonthKey(2023, 11)).toBe('2023-12');
  });
  it('pads single-digit months', () => {
    expect(getMonthKey(2024, 8)).toBe('2024-09');
  });
});

describe('todayISO', () => {
  it('returns YYYY-MM-DD format', () => {
    const iso = todayISO();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('toMonthKey', () => {
  it('converts Date to YYYY-MM', () => {
    expect(toMonthKey(new Date(2024, 2, 15))).toBe('2024-03');
  });
  it('January is "01"', () => {
    expect(toMonthKey(new Date(2024, 0, 1))).toBe('2024-01');
  });
});

describe('filterByMonth', () => {
  const txns = [
    { id: 1, date: '2024-03-15', value: 100, type: 'expense' },
    { id: 2, date: '2024-03-20', value: 200, type: 'income' },
    { id: 3, date: '2024-02-01', value: 50, type: 'expense' },
    { id: 4, date: '2024-01-10', value: 300, type: 'expense', invoiceMonth: '2024-03' },
    { id: 5, date: null, value: 80, type: 'expense', invoiceMonth: '2024-03' },
    { id: 6, date: '2024-04-05', value: 400, type: 'income' },
  ];

  it('filters by year+month prefix on date (March = month index 2 → prefix 2024-03)', () => {
    const result = filterByMonth(txns, 2024, 2);
    expect(result).toHaveLength(4);
    expect(result.map(t => t.id).sort()).toEqual([1, 2, 4, 5]);
  });
  it('filters February transactions (month index 1)', () => {
    const result = filterByMonth(txns, 2024, 1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });
  it('matches invoiceMonth for card transactions', () => {
    const result = filterByMonth(txns, 2024, 2);
    const cardTx = result.find(t => t.invoiceMonth === '2024-03');
    expect(cardTx).toBeDefined();
    expect(cardTx.id).toBe(4);
  });
  it('matches invoiceMonth even when date is null', () => {
    const result = filterByMonth(txns, 2024, 2);
    expect(result.find(t => t.id === 5)).toBeDefined();
  });
  it('returns empty array for no matches', () => {
    const result = filterByMonth(txns, 2025, 0);
    expect(result).toEqual([]);
  });
});

describe('calcTotals', () => {
  it('empty array returns all zeros', () => {
    const result = calcTotals([]);
    expect(result).toEqual({ income: 0, expense: 0, investment: 0, creditCard: 0, balance: 0 });
  });
  it('sums income transactions', () => {
    const txns = [{ type: 'income', value: 1000 }, { type: 'income', value: 500 }];
    const result = calcTotals(txns);
    expect(result.income).toBe(1500);
  });
  it('sums expense transactions', () => {
    const txns = [{ type: 'expense', value: 200 }, { type: 'expense', value: 300 }];
    const result = calcTotals(txns);
    expect(result.expense).toBe(500);
  });
  it('identifies credit card expenses by invoiceMonth', () => {
    const txns = [{ type: 'expense', value: 500, invoiceMonth: '2024-03' }];
    const result = calcTotals(txns);
    expect(result.creditCard).toBe(500);
  });
  it('identifies credit card expenses by paymentMethod', () => {
    const txns = [{ type: 'expense', value: 200, paymentMethod: 'Crédito' }];
    const result = calcTotals(txns);
    expect(result.creditCard).toBe(200);
  });
  it('identifies credit card expenses by cardId', () => {
    const txns = [{ type: 'expense', value: 150, cardId: 'card-1' }];
    const result = calcTotals(txns);
    expect(result.creditCard).toBe(150);
  });
  it('sums investment transactions', () => {
    const txns = [{ type: 'investment', value: 500 }];
    const result = calcTotals(txns);
    expect(result.investment).toBe(500);
  });
  it('balance = income - expense - investment', () => {
    const txns = [
      { type: 'income', value: 2000 },
      { type: 'expense', value: 800 },
      { type: 'investment', value: 200 },
    ];
    const result = calcTotals(txns);
    expect(result.balance).toBe(1000);
  });
  it('handles missing value as 0', () => {
    const txns = [{ type: 'income' }];
    const result = calcTotals(txns);
    expect(result.income).toBe(0);
  });
});

describe('groupByCategory', () => {
  it('groups and sums by category', () => {
    const txns = [
      { category: 'Alimentação', value: 100 },
      { category: 'Alimentação', value: 50 },
      { category: 'Transporte', value: 80 },
    ];
    const result = groupByCategory(txns);
    expect(result).toEqual([
      ['Alimentação', 150],
      ['Transporte', 80],
    ]);
  });
  it('missing category defaults to "Outros"', () => {
    const txns = [
      { value: 50 },
      { category: 'Salário', value: 200 },
    ];
    const result = groupByCategory(txns);
    const outros = result.find(([cat]) => cat === 'Outros');
    expect(outros[1]).toBe(50);
  });
  it('sorted by value descending', () => {
    const txns = [
      { category: 'A', value: 10 },
      { category: 'B', value: 100 },
      { category: 'C', value: 50 },
    ];
    const result = groupByCategory(txns);
    expect(result[0][1]).toBeGreaterThanOrEqual(result[1][1]);
    expect(result[1][1]).toBeGreaterThanOrEqual(result[2][1]);
  });
  it('handles missing values as 0', () => {
    const txns = [{ category: 'X' }];
    const result = groupByCategory(txns);
    expect(result[0][1]).toBe(0);
  });
});

describe('getGoalProgress', () => {
  it('manual mode returns goal.currentValue', () => {
    const goal = { id: 'g1', progressMode: 'manual', currentValue: 500 };
    expect(getGoalProgress(goal, [])).toBe(500);
  });
  it('manual mode handles missing currentValue as 0', () => {
    const goal = { id: 'g1', progressMode: 'manual' };
    expect(getGoalProgress(goal, [])).toBe(0);
  });
  it('linked mode sums linked transactions', () => {
    const goal = { id: 'g1', progressMode: 'linked' };
    const txns = [
      { goalId: 'g1', value: 100 },
      { goalId: 'g1', value: 200 },
      { goalId: 'g2', value: 50 },
    ];
    expect(getGoalProgress(goal, txns)).toBe(300);
  });
  it('linked mode default when no progressMode specified', () => {
    const goal = { id: 'g1' };
    const txns = [{ goalId: 'g1', value: 150 }];
    expect(getGoalProgress(goal, txns)).toBe(150);
  });
  it('handles missing transactions array', () => {
    const goal = { id: 'g1', progressMode: 'linked' };
    expect(getGoalProgress(goal, undefined)).toBe(0);
  });
});

describe('getBudgetUsed', () => {
  it('sums matching category and month expenses', () => {
    const budget = { category: 'Alimentação', month: '2024-03' };
    const txns = [
      { type: 'expense', category: 'Alimentação', value: 100, date: '2024-03-15' },
      { type: 'expense', category: 'Alimentação', value: 50, date: '2024-03-20' },
    ];
    expect(getBudgetUsed(budget, txns)).toBe(150);
  });
  it('ignores income transactions', () => {
    const budget = { category: 'Alimentação', month: '2024-03' };
    const txns = [
      { type: 'income', category: 'Alimentação', value: 500, date: '2024-03-01' },
    ];
    expect(getBudgetUsed(budget, txns)).toBe(0);
  });
  it('ignores different months', () => {
    const budget = { category: 'Alimentação', month: '2024-03' };
    const txns = [
      { type: 'expense', category: 'Alimentação', value: 100, date: '2024-04-15' },
    ];
    expect(getBudgetUsed(budget, txns)).toBe(0);
  });
  it('returns 0 for no matches', () => {
    const budget = { category: 'X', month: '2024-03' };
    expect(getBudgetUsed(budget, [])).toBe(0);
  });
  it('handles missing date field', () => {
    const budget = { category: 'Alimentação', month: '2024-03' };
    const txns = [
      { type: 'expense', category: 'Alimentação', value: 100 },
    ];
    expect(getBudgetUsed(budget, txns)).toBe(0);
  });
});

describe('getTypeLabel', () => {
  it('income → "Receita"', () => { expect(getTypeLabel('income')).toBe('Receita'); });
  it('expense → "Despesa"', () => { expect(getTypeLabel('expense')).toBe('Despesa'); });
  it('investment → "Investimento"', () => { expect(getTypeLabel('investment')).toBe('Investimento'); });
  it('unknown type returns itself', () => { expect(getTypeLabel('other')).toBe('other'); });
});

describe('getTypeColor', () => {
  it('income → text-emerald-600', () => { expect(getTypeColor('income')).toBe('text-emerald-600'); });
  it('expense → text-red-500', () => { expect(getTypeColor('expense')).toBe('text-red-500'); });
  it('investment → text-violet-500', () => { expect(getTypeColor('investment')).toBe('text-violet-500'); });
  it('unknown → text-muted-foreground', () => { expect(getTypeColor('other')).toBe('text-muted-foreground'); });
});

describe('getTypeBg', () => {
  it('income returns emerald classes', () => {
    expect(getTypeBg('income')).toBe('bg-emerald-50 text-emerald-700 border-emerald-200');
  });
  it('expense returns red classes', () => {
    expect(getTypeBg('expense')).toBe('bg-red-50 text-red-700 border-red-200');
  });
  it('investment returns violet classes', () => {
    expect(getTypeBg('investment')).toBe('bg-violet-50 text-violet-700 border-violet-200');
  });
  it('unknown returns muted classes', () => {
    expect(getTypeBg('other')).toBe('bg-muted text-muted-foreground');
  });
});

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });
  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('getDaysInMonth', () => {
  it('February 2024 (leap year) → 29', () => {
    expect(getDaysInMonth(2024, 1)).toBe(29);
  });
  it('February 2023 → 28', () => {
    expect(getDaysInMonth(2023, 1)).toBe(28);
  });
  it('January 2024 → 31', () => {
    expect(getDaysInMonth(2024, 0)).toBe(31);
  });
});

describe('getFirstDayOfMonth', () => {
  it('January 2024 → 1 (Monday)', () => {
    expect(getFirstDayOfMonth(2024, 0)).toBe(1);
  });
  it('January 2024 day-of-week starts with Sunday=0', () => {
    // Jan 1, 2024 is a Monday → 1
    expect(getFirstDayOfMonth(2024, 0)).toBeGreaterThanOrEqual(0);
    expect(getFirstDayOfMonth(2024, 0)).toBeLessThanOrEqual(6);
  });
});

describe('getLast6Months', () => {
  it('returns exactly 6 entries', () => {
    expect(getLast6Months()).toHaveLength(6);
  });
  it('each entry has year and month', () => {
    const months = getLast6Months();
    months.forEach(m => {
      expect(m).toHaveProperty('year');
      expect(m).toHaveProperty('month');
      expect(m.month).toBeGreaterThanOrEqual(0);
      expect(m.month).toBeLessThanOrEqual(11);
    });
  });
  it('returns descending chronological order (oldest first)', () => {
    const months = getLast6Months();
    for (let i = 1; i < months.length; i++) {
      const prev = months[i - 1];
      const curr = months[i];
      if (prev.year === curr.year) {
        expect(curr.month).toBeGreaterThan(prev.month);
      }
    }
  });
});

describe('formatSmartDate', () => {
  it('returns "-" for null/empty', () => {
    expect(formatSmartDate(null)).toBe('-');
    expect(formatSmartDate('')).toBe('-');
  });
  it('returns "Hoje, {day} {MONTH_SHORT}" for today', () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const result = formatSmartDate(todayStr);
    expect(result).toMatch(/^Hoje, \d{1,2} [A-Z]{3}$/);
  });
  it('returns "Ontem, {day} {MONTH_SHORT}" for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const result = formatSmartDate(yesterdayStr);
    expect(result).toMatch(/^Ontem, \d{1,2} [A-Z]{3}$/);
  });
  it('returns "{day} {MONTH_SHORT}" for other dates', () => {
    const result = formatSmartDate('2024-03-15');
    expect(result).toMatch(/^\d{1,2} [A-Z]{3}$/);
  });
});

describe('clampDateInput', () => {
  it('caps year > 2099 to 2099', () => {
    expect(clampDateInput('3000-01-15')).toBe('2099-01-15');
  });
  it('caps year < 1900 to 1900', () => {
    expect(clampDateInput('1800-06-20')).toBe('1900-06-20');
  });
  it('returns null for null input', () => {
    expect(clampDateInput(null)).toBeNull();
  });
  it('returns undefined for undefined', () => {
    expect(clampDateInput(undefined)).toBeUndefined();
  });
  it('leaves valid date unchanged', () => {
    expect(clampDateInput('2024-03-15')).toBe('2024-03-15');
  });
  it('caps only the year portion', () => {
    expect(clampDateInput('2100-12-31')).toBe('2099-12-31');
  });
});

describe('isToday', () => {
  it('returns true for today', () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(isToday(todayStr)).toBe(true);
  });
  it('returns false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    expect(isToday(yesterdayStr)).toBe(false);
  });
  it('returns false for null', () => {
    expect(isToday(null)).toBe(false);
  });
  it('returns false for empty string', () => {
    expect(isToday('')).toBe(false);
  });
});
