import React from 'react';
import { Lightbulb, DollarSign, FileText, CreditCard, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSalaryConfig, getTemplates, getFinancings, getSuggestionsLog, setSuggestionApplied } from '@/lib/store';
import { getMonthKey } from '@/lib/financeUtils';

export default function SuggestionBanner({ currentMonth, currentYear, transactions, onCreateTransaction }) {
  const monthKey = getMonthKey(currentYear, currentMonth);
  const log = getSuggestionsLog();
  const sugg = log[monthKey] || {};

  const salaryConfig = getSalaryConfig();
  const templates = getTemplates();
  const financings = getFinancings().filter(f => !f.done);

  const hasSalary = salaryConfig.value > 0;
  const hasTemplates = templates.length > 0;
  const hasFinancings = financings.length > 0;

  const salaryApplied = sugg.salaryApplied;
  const fixedApplied = sugg.fixedApplied;
  const financingApplied = sugg.financingApplied;

  const showBanner = (hasSalary && !salaryApplied) || (hasTemplates && !fixedApplied) || (hasFinancings && !financingApplied);

  if (!showBanner) return null;

  const applySalary = () => {
    const alreadyExists = transactions.some(t => {
      if (t.type !== 'income' || t.category !== 'Salário') return false;
      return t.date && t.date.startsWith(monthKey);
    });
    if (alreadyExists) return;
    const day = String(salaryConfig.day || 5).padStart(2, '0');
    onCreateTransaction({
      type: 'income',
      description: 'Salário',
      value: Math.abs(salaryConfig.value),
      date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${day}`,
      category: 'Salário',
      paymentMethod: 'Transferência',
      isFixed: false,
      isInstallment: false,
    });
    setSuggestionApplied(monthKey, 'salaryApplied');
  };

  const applyFixedTemplates = () => {
    let added = 0;
    const monthPrefix = getMonthKey(currentYear, currentMonth);
    const txBatch = [];
    templates.forEach(tpl => {
      const alreadyExists = transactions.some(t =>
        t.date?.startsWith(monthPrefix) && t.description === tpl.description && t.type === 'expense'
      );
      if (!alreadyExists) {
        txBatch.push({
          type: 'expense',
          description: tpl.description,
          value: Math.abs(tpl.value || 0),
          date: `${monthPrefix}-01`,
          category: tpl.category || 'Outros',
          paymentMethod: tpl.paymentMethod || 'Pix',
          isFixed: true,
          isInstallment: false,
        });
        added++;
      }
    });
    txBatch.forEach(tx => onCreateTransaction(tx));
    setSuggestionApplied(monthKey, 'fixedApplied');
  };

  const applyFinancings = () => {
    let added = 0;
    const monthPrefix = getMonthKey(currentYear, currentMonth);
    const txBatch = [];
    financings.forEach(f => {
      const alreadyExists = transactions.some(t =>
        t.date?.startsWith(monthPrefix) && t.description === f.description && t.type === 'expense'
      );
      if (!alreadyExists) {
        txBatch.push({
          type: 'expense',
          description: f.description,
          value: Math.abs(f.installmentValue || 0),
          date: `${monthPrefix}-01`,
          category: 'Contas',
          paymentMethod: 'Transferência',
          isFixed: true,
          isInstallment: false,
        });
        added++;
      }
    });
    txBatch.forEach(tx => onCreateTransaction(tx));
    setSuggestionApplied(monthKey, 'financingApplied');
  };

  const dismiss = () => {
    setSuggestionApplied(monthKey, 'salaryApplied');
    setSuggestionApplied(monthKey, 'fixedApplied');
    setSuggestionApplied(monthKey, 'financingApplied');
  };

  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3.5 flex items-center justify-between gap-4 flex-wrap animate-fade-in dark:bg-amber-950/30 dark:border-amber-800">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center shrink-0 mt-0.5 dark:bg-amber-900/50">
          <Lightbulb size={16} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Sugestões do mês</p>
          <p className="text-xs text-amber-700 mt-0.5 dark:text-amber-400">
            Adicione rapidamente seu salário, despesas fixas e financiamentos.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {hasSalary && !salaryApplied && (
          <button
            onClick={applySalary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <DollarSign size={12} />
            Salário ({formatCurrency(salaryConfig.value)})
          </button>
        )}
        {hasTemplates && !fixedApplied && (
          <button
            onClick={applyFixedTemplates}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <FileText size={12} />
            Despesas Fixas
          </button>
        )}
        {hasFinancings && !financingApplied && (
          <button
            onClick={applyFinancings}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <CreditCard size={12} />
            Financiamento
          </button>
        )}
        <button
          onClick={dismiss}
          className="p-1.5 rounded border border-amber-300 text-amber-600 hover:bg-amber-100 transition-colors dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/50"
          aria-label="Dispensar sugestões"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
