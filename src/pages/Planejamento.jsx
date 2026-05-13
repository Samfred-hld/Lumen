// ══════════════════════════════════════════
// LÚMEN — Planejamento (Budgets + Goals unificados)
// ══════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Pencil, Repeat, Clock, CheckCircle2, AlertTriangle, History, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdaptiveModal } from '@/components/ui/adaptive-modal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, filterByMonth, getMonthKey, getGoalProgress, clampDateInput, calcTotals } from '@/lib/financeUtils';
import { DEFAULT_CATEGORIES, MONTH_NAMES, CAT_COLORS, getCategoryIcon } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { useMonthNavigation } from '@/hooks/useMonthNavigation';
import { useBudgets, useTransactions, useGoals } from '@/hooks/useData';

// Material Symbols icon component
function MsIcon({ name, className, size = 24, filled = false }) {
  return (
    <span
      className={cn('material-symbols-outlined', className)}
      style={{ fontSize: size, fontVariationSettings: `'FILL' ${filled ? 1 : 0}` }}
    >
      {name}
    </span>
  );
}

// Category icon mapping for Material Symbols
const CAT_MATERIAL_ICONS = {
  'Alimentação': 'restaurant',
  'Transporte': 'directions_car',
  'Combustível': 'local_gas_station',
  'Moradia': 'home',
  'Saúde': 'local_hospital',
  'Academia': 'fitness_center',
  'Lazer': 'sports_esports',
  'Streaming': 'subscriptions',
  'Entretenimiento': 'movie',
  'Telecomunicações': 'phone_android',
  'Serviços': 'build',
  'Educação': 'school',
  'Educação Online': 'computer',
  'Compras online': 'shopping_cart',
  'Vestuário': 'checkroom',
  'Pet': 'pets',
  'Casa': 'home',
  'Seguro': 'shield',
  'Impostos': 'receipt',
  'Contas': 'receipt_long',
  'Viagens': 'flight',
  'Presentes': 'card_giftcard',
  'Doações': 'volunteer_activism',
  'Beleza': 'spa',
  'Bem-estar': 'self_improvement',
  'Papelaria': 'edit',
  'Salário': 'payments',
  'Investimentos': 'account_balance',
  'Financeiro': 'account_balance_wallet',
  'Outros': 'more_horiz',
  'Tarifas bancárias': 'credit_card',
  'Encargos': 'gavel',
  'Aluguel de Veículos': 'directions_car',
};

// ═══ Goal Schema ═══
const GOAL_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'];

const goalSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(60, 'Nome muito longo'),
  targetValue: z.number({ invalid_type_error: 'Informe um valor numérico' }).positive('O valor alvo deve ser maior que zero'),
  currentValue: z.number({ invalid_type_error: 'Informe um valor numérico' }).min(0).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional().or(z.literal('')),
  description: z.string().optional(),
});

// ══════════════════════════════════════════
// MODALS (Goals only — Budgets use inline manager)
// ══════════════════════════════════════════

function GoalModal({ open, onClose, onSave, goal }) {
  const { control, register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: { name: '', targetValue: undefined, currentValue: undefined, deadline: '', description: '' },
  });

  const [progressMode, setProgressMode] = useState('linked');
  const [color, setColor] = useState('#10b981');

  React.useEffect(() => {
    if (goal) {
      reset({
        name: goal.name || '',
        targetValue: goal.targetValue || undefined,
        currentValue: goal.currentValue ?? undefined,
        deadline: goal.deadline || '',
        description: goal.description || goal.icon || '',
      });
      setColor(goal.color || '#10b981');
      setProgressMode(goal.progressMode || 'linked');
    } else {
      reset({ name: '', targetValue: undefined, currentValue: undefined, deadline: '', description: '' });
      setColor('#10b981');
      setProgressMode('linked');
    }
  }, [goal, open, reset]);

  const onSubmit = (data) => {
    onSave({
      ...data,
      color,
      progressMode,
      currentValue: progressMode === 'manual' && data.currentValue !== undefined ? data.currentValue : null,
    });
  };

  return (
    <AdaptiveModal open={open} onOpenChange={onClose} title={goal ? 'Editar Objetivo' : 'Novo Objetivo'}>
      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label>Nome do Objetivo</Label>
          <Input {...register('name')} className="mt-1" placeholder="Ex: Reserva de Emergência" />
          {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Valor Alvo (R$)</Label>
            <Input {...register('targetValue', { valueAsNumber: true })} type="number" min="0" step="0.01" className="mt-1" />
            {errors.targetValue && <p className="text-sm text-destructive mt-1">{errors.targetValue.message}</p>}
          </div>
          <div>
            <Label>Progresso</Label>
            <div className="flex gap-1.5 mt-1">
              <button type="button" onClick={() => setProgressMode('linked')}
                className={cn("flex-1 text-xs py-1.5 px-2 rounded border transition-colors",
                  progressMode === 'linked' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border')}>
                Transações
              </button>
              <button type="button" onClick={() => setProgressMode('manual')}
                className={cn("flex-1 text-xs py-1.5 px-2 rounded border transition-colors",
                  progressMode === 'manual' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border')}>
                Manual
              </button>
            </div>
          </div>
        </div>
        {progressMode === 'manual' && (
          <div>
            <Label>Valor Atual (R$)</Label>
            <Input {...register('currentValue', { valueAsNumber: true })} type="number" min="0" step="0.01" className="mt-1" />
          </div>
        )}
        <div>
          <Label>Prazo</Label>
          <Input {...register('deadline')} type="date" max="2099-12-31" min="1900-01-01"
            onChange={(e) => register('deadline').onChange({ target: { value: clampDateInput(e.target.value), name: 'deadline' } })}
            className="mt-1" />
        </div>
        <div>
          <Label>Descrição</Label>
          <Input {...register('description')} className="mt-1" placeholder="Opcional..." />
        </div>
        <div>
          <Label>Cor</Label>
          <div className="flex gap-2 mt-1">
            {GOAL_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={cn("w-6 h-6 rounded-full transition-transform", color === c && "ring-2 ring-offset-2 ring-ring scale-110")}
                style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" type="submit">{goal ? 'Salvar' : 'Criar'}</Button>
        </div>
      </form>
    </AdaptiveModal>
  );
}

function DepositModal({ open, onClose, onSave, goal }) {
  const [value, setValue] = useState('');
  return (
    <AdaptiveModal open={open} onOpenChange={onClose} title={`Registrar progresso — "${goal?.name}"`} className="max-w-xs">
      <div>
        <Label>Valor (R$)</Label>
        <Input type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} className="mt-1" />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1" onClick={() => { onSave(parseFloat(value)); setValue(''); }}>Registrar</Button>
      </div>
    </AdaptiveModal>
  );
}

// ══════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════

export default function Planejamento() {
  const { month: currentMonth, year: currentYear, navigate } = useMonthNavigation();
  const monthKey = getMonthKey(currentYear, currentMonth);

  // Data
  const { data: rawBudgets, refetch: refetchBudgets } = useBudgets();
  const { data: rawTransactions } = useTransactions();
  const { data: rawGoals, refetch: refetchGoals } = useGoals();

  const budgets = Array.isArray(rawBudgets) ? rawBudgets : [];
  const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];
  const goals = Array.isArray(rawGoals) ? rawGoals : [];

  // Modals
  const [showBudgetManager, setShowBudgetManager] = useState(false);
  const [budgetValues, setBudgetValues] = useState({}); // { category: limit }
  const [newCategory, setNewCategory] = useState('');
  const [editingBudget, setEditingBudget] = useState(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [depositGoal, setDepositGoal] = useState(null);

  // Computed
  const monthBudgets = useMemo(() => budgets.filter(b => b.month === monthKey), [budgets, monthKey]);
  const monthTx = useMemo(() => filterByMonth(transactions, currentYear, currentMonth), [transactions, currentYear, currentMonth]);
  const totals = useMemo(() => calcTotals(monthTx), [monthTx]);

  const totalBudgetLimit = monthBudgets.reduce((s, b) => s + (b.limit || 0), 0);
  const totalBudgetSpent = monthBudgets.reduce((s, b) => {
    const spent = monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((a, t) => a + (t.value || 0), 0);
    return s + spent;
  }, 0);

  const totalGoalTarget = goals.reduce((s, g) => s + (g.targetValue || 0), 0);
  const totalGoalCurrent = goals.reduce((s, g) => s + getGoalProgress(g, transactions), 0);
  const goalProgressPct = totalGoalTarget > 0 ? Math.round((totalGoalCurrent / totalGoalTarget) * 100) : 0;

  const projectedSavings = totals.income - totalBudgetSpent - totals.investment;

  // Handlers — Budgets (inline manager)
  const openBudgetManager = () => {
    // Initialize with existing budget limits
    const vals = {};
    monthBudgets.forEach(b => { vals[b.category] = String(b.limit || ''); });
    setBudgetValues(vals);
    setNewCategory('');
    setShowBudgetManager(true);
  };

  const handleBudgetValueChange = (category, value) => {
    setBudgetValues(prev => ({ ...prev, [category]: value }));
  };

  const handleAddCategory = () => {
    if (newCategory && !budgetValues.hasOwnProperty(newCategory)) {
      setBudgetValues(prev => ({ ...prev, [newCategory]: '' }));
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (category) => {
    setBudgetValues(prev => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  };

  const handleSaveAllBudgets = async () => {
    // Save each category with a value > 0
    const entries = Object.entries(budgetValues).filter(([, v]) => parseFloat(v) > 0);

    for (const [category, value] of entries) {
      const limit = parseFloat(value);
      const existing = monthBudgets.find(b => b.category === category);
      if (existing) {
        if (existing.limit !== limit) {
          await base44.entities.Budget.update(existing.id, { limit });
        }
      } else {
        await base44.entities.Budget.create({ category, limit, month: monthKey, isRecurring: false });
      }
    }

    // Delete budgets for categories removed (had budget, now empty/removed)
    for (const b of monthBudgets) {
      if (!budgetValues.hasOwnProperty(b.category) || parseFloat(budgetValues[b.category]) <= 0) {
        await base44.entities.Budget.delete(b.id);
      }
    }

    refetchBudgets();
    setShowBudgetManager(false);
  };

  const handleDeleteBudget = async (id) => {
    await base44.entities.Budget.delete(id);
    refetchBudgets();
  };

  // Handlers — Goals
  const handleSaveGoal = async (data) => {
    if (editingGoal) await base44.entities.Goal.update(editingGoal.id, data);
    else await base44.entities.Goal.create(data);
    refetchGoals();
    setShowGoalModal(false);
    setEditingGoal(null);
  };

  const handleDeleteGoal = async (id) => {
    await base44.entities.Goal.delete(id);
    refetchGoals();
  };

  const handleDeposit = async (amount) => {
    const goal = depositGoal;
    const current = getGoalProgress(goal, transactions);
    await base44.entities.Goal.update(goal.id, { currentValue: current + amount });
    refetchGoals();
    setDepositGoal(null);
  };

  return (
    <div className="space-y-xl">
      {/* ═══ Hero Section ═══ */}
      <section className="space-y-md">
        <div className="flex justify-between items-end border-b border-surface-border pb-sm">
          <h2 className="font-headline text-display-sm text-on-surface">Planejamento Mensal</h2>
          <span className="font-mono-number text-on-surface-variant text-sm">
            {MONTH_NAMES[currentMonth].toUpperCase()} {currentYear}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          <div className="space-y-xs min-w-0">
            <p className="font-label-caps text-label-caps text-muted-foreground">TOTAL ALOCADO</p>
            <h3 className="font-display-sm text-display-sm tabular-nums text-on-surface truncate">{formatCurrency(totalBudgetLimit)}</h3>
            <div className="h-[1px] w-full bg-editorial-rule" />
          </div>
          <div className="space-y-xs min-w-0">
            <p className="font-label-caps text-label-caps text-muted-foreground">ECONOMIA PROJETADA</p>
            <h3 className={cn("font-display-sm text-display-sm tabular-nums truncate", projectedSavings >= 0 ? 'text-success' : 'text-danger')}>
              {formatCurrency(projectedSavings)}
            </h3>
            <div className="h-[1px] w-full bg-editorial-rule" />
          </div>
          <div className="space-y-xs min-w-0">
            <p className="font-label-caps text-label-caps text-muted-foreground">PROGRESSO DAS METAS</p>
            <h3 className="font-display-sm text-display-sm tabular-nums text-on-surface">{goalProgressPct}%</h3>
            <div className="h-[1px] w-full bg-editorial-rule" />
          </div>
        </div>
      </section>

      {/* ═══ Main Layout: Budgets + Goals ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        {/* ── Budgets (8 cols) ── */}
        <div className="lg:col-span-8 space-y-lg">
          <div className="flex items-center justify-between border-b border-surface-border pb-base">
            <h3 className="font-headline text-headline">Orçamentos por Categoria</h3>
            <div className="flex items-center gap-md">
              {/* Month navigation */}
              <div className="flex items-center gap-1 bg-surface border border-surface-border rounded px-2 py-1">
                <button onClick={() => navigate(-1)} className="p-1 hover:bg-surface-container-low rounded" aria-label="Mês anterior">
                  <MsIcon name="chevron_left" size={14} className="text-on-surface-variant" />
                </button>
                <span className="text-sm font-medium px-2 min-w-[100px] text-center font-mono-number">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
                <button onClick={() => navigate(1)} className="p-1 hover:bg-surface-container-low rounded" aria-label="Próximo mês">
                  <MsIcon name="chevron_right" size={14} className="text-on-surface-variant" />
                </button>
              </div>
              <button
                onClick={openBudgetManager}
                className="font-label-caps text-label-caps text-primary-light hover:underline"
              >
                GERENCIAR ORÇAMENTOS
              </button>
            </div>
          </div>

          {/* ── Inline Budget Manager ── */}
          {showBudgetManager && (
            <div className="bg-surface border border-surface-border p-card-padding space-y-md animate-fade-in-up">
              <div className="flex items-center justify-between mb-sm">
                <h4 className="font-title text-title">Gerenciar Orçamentos</h4>
                <button onClick={() => setShowBudgetManager(false)} className="text-muted-foreground hover:text-on-surface">
                  <MsIcon name="close" size={18} />
                </button>
              </div>

              {/* Existing categories with values */}
              <div className="space-y-sm">
                {Object.entries(budgetValues).map(([category, value]) => {
                  const icon = CAT_MATERIAL_ICONS[category] || 'category';
                  return (
                    <div key={category} className="flex items-center gap-sm">
                      <MsIcon name={icon} size={18} className="text-on-surface-variant shrink-0" />
                      <span className="text-sm font-medium flex-1 truncate">{category}</span>
                      <div className="relative w-32 shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={value}
                          onChange={e => handleBudgetValueChange(category, e.target.value)}
                          className="w-full h-8 pl-8 pr-2 text-right text-sm font-mono-number border border-surface-border rounded bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="0,00"
                        />
                      </div>
                      <button onClick={() => handleRemoveCategory(category)}
                        className="p-1 hover:bg-red-50 rounded text-red-400 shrink-0" aria-label="Remover">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add new category */}
              <div className="flex items-center gap-sm pt-sm border-t border-surface-border">
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="flex-1 h-8 text-sm">
                    <SelectValue placeholder="Adicionar categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_CATEGORIES
                      .filter(c => !budgetValues.hasOwnProperty(c))
                      .map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <button onClick={handleAddCategory} disabled={!newCategory}
                  className="p-1.5 rounded bg-primary-container text-on-primary-container disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all">
                  <MsIcon name="add" size={16} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-sm pt-sm">
                <Button variant="outline" className="flex-1" onClick={() => setShowBudgetManager(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleSaveAllBudgets}>Salvar Tudo</Button>
              </div>
            </div>
          )}

          {/* ── Budget Cards ── */}
          {!showBudgetManager && monthBudgets.length === 0 ? (
            <div className="bg-surface border border-surface-border p-xl text-center">
              <MsIcon name="account_balance" size={40} className="text-muted-foreground mx-auto mb-md" />
              <p className="text-muted-foreground text-sm mb-md">Nenhum orçamento para este mês</p>
              <Button size="sm" onClick={openBudgetManager}>
                <Plus size={14} className="mr-1" /> Gerenciar orçamentos
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
              {monthBudgets.map(b => {
                const spent = monthTx
                  .filter(t => t.type === 'expense' && t.category === b.category)
                  .reduce((s, t) => s + (t.value || 0), 0);
                const pct = b.limit > 0 ? Math.min(100, (spent / b.limit) * 100) : 0;
                const over = spent > b.limit;
                const remaining = Math.max(0, b.limit - spent);
                const icon = CAT_MATERIAL_ICONS[b.category] || 'category';

                return (
                  <div key={b.id} className="bg-surface border border-surface-border p-card-padding space-y-md relative group">
                    <div className={cn("absolute top-0 left-0 w-full h-[3px]", over ? 'bg-kpi-expense' : 'bg-kpi-income')} />
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-title text-title">{b.category}</p>
                        {b.isRecurring && (
                          <p className="font-body-sm text-on-surface-variant flex items-center gap-xs mt-xs">
                            <Repeat size={10} /> Recorrente
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-sm">
                        <MsIcon name={icon} size={20} className="text-on-surface-variant" />
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingBudget(b); openBudgetManager(); }}
                            className="p-1 hover:bg-surface-container-low rounded text-muted-foreground" aria-label="Editar">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => handleDeleteBudget(b.id)}
                            className="p-1 hover:bg-red-50 rounded text-red-400" aria-label="Excluir">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-xs">
                      <div className="flex justify-between font-mono-number text-body-sm">
                        <span className={cn(over && "text-error font-bold")}>{formatCurrency(spent)}</span>
                        <span className="text-on-surface-variant">de {formatCurrency(b.limit)}</span>
                      </div>
                      <div className="h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-500", over ? 'bg-error' : 'bg-primary-container')}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-xs border-t border-surface-border/50">
                      <span className="font-label-caps text-label-caps text-muted-foreground">
                        {over ? 'EXCEDIDO' : 'RESTANTE'}
                      </span>
                      <span className={cn("font-mono-number", over ? 'text-error' : 'text-success')}>
                        {over ? `- ${formatCurrency(spent - b.limit)}` : formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Goals (4 cols) ── */}
        <div className="lg:col-span-4 space-y-lg">
          <div className="flex items-center justify-between border-b border-surface-border pb-base">
            <h3 className="font-headline text-headline">Objetivos de Longo Prazo</h3>
            <button onClick={() => { setEditingGoal(null); setShowGoalModal(true); }}
              className="text-on-surface-variant hover:text-primary transition-colors" aria-label="Novo objetivo">
              <MsIcon name="add_circle" size={20} />
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="bg-surface border border-surface-border p-xl text-center">
              <MsIcon name="flag" size={40} className="text-muted-foreground mx-auto mb-md" />
              <p className="text-muted-foreground text-sm mb-md">Nenhum objetivo cadastrado</p>
              <Button size="sm" onClick={() => setShowGoalModal(true)}>
                <Plus size={14} className="mr-1" /> Criar primeiro objetivo
              </Button>
            </div>
          ) : (
            <div className="space-y-lg">
              {goals.map(g => {
                const current = getGoalProgress(g, transactions);
                const pct = Math.min(100, g.targetValue > 0 ? (current / g.targetValue) * 100 : 0);
                const done = pct >= 100;
                const today = new Date().toISOString().split('T')[0];
                const overdue = g.deadline && g.deadline < today && !done;
                const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / 86400000) : null;
                const strokeColor = g.color || '#10b981';
                const circumference = 2 * Math.PI * 20; // r=20
                const offset = circumference - (pct / 100) * circumference;

                return (
                  <div key={g.id} className="bg-surface-container-low border border-surface-border p-card-padding space-y-lg group">
                    {/* Header with circular progress */}
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-sm">
                          <p className="font-title text-title truncate">{g.name}</p>
                          {done && <CheckCircle2 size={14} className="text-success shrink-0" />}
                          {overdue && !done && <AlertTriangle size={14} className="text-danger shrink-0" />}
                        </div>
                        {g.description && <p className="font-body-sm text-on-surface-variant mt-xs truncate">{g.description}</p>}
                      </div>
                      <div className="relative w-12 h-12 flex items-center justify-center shrink-0 ml-sm">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor"
                            className="text-surface-container-high" strokeWidth="4" />
                          <circle cx="24" cy="24" r="20" fill="transparent" stroke={strokeColor}
                            strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset}
                            strokeLinecap="round" />
                        </svg>
                        <span className="absolute text-[10px] font-bold text-on-surface">{Math.round(pct)}%</span>
                      </div>
                    </div>

                    {/* Accumulated / Target */}
                    <div className="grid grid-cols-2 gap-md border-t border-surface-border pt-md">
                      <div>
                        <p className="font-label-caps text-[10px] text-muted-foreground">ACUMULADO</p>
                        <p className="font-mono-number text-title tabular-nums">{formatCurrency(current)}</p>
                      </div>
                      <div>
                        <p className="font-label-caps text-[10px] text-muted-foreground">OBJETIVO</p>
                        <p className="font-mono-number text-title tabular-nums">{formatCurrency(g.targetValue)}</p>
                      </div>
                    </div>

                    {/* Forecast or Recurrence */}
                    {g.deadline && !done && (
                      <div className="bg-primary-light/10 p-sm rounded-sm">
                        <p className="font-body-sm text-primary flex items-center gap-xs">
                          <MsIcon name="event" size={14} />
                          Previsão: {new Date(g.deadline + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-sm">
                      {!done && (
                        <Button size="sm" variant="outline" onClick={() => setDepositGoal(g)}
                          className="flex-1 text-xs h-8 rounded hover:bg-primary hover:text-primary-foreground transition-colors">
                          <Plus size={12} className="mr-1" /> Registrar
                        </Button>
                      )}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingGoal(g); setShowGoalModal(true); }}
                          className="p-1.5 hover:bg-surface-container rounded text-muted-foreground" aria-label="Editar">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDeleteGoal(g.id)}
                          className="p-1.5 hover:bg-red-50 rounded text-red-400" aria-label="Excluir">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── AI Recommendation Card ── */}
          {goals.length > 0 && monthBudgets.length > 0 && (() => {
            // Find the most over-budget category
            const overBudgets = monthBudgets
              .map(b => {
                const spent = monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((s, t) => s + (t.value || 0), 0);
                return { ...b, spent, over: spent - b.limit };
              })
              .filter(b => b.over > 0)
              .sort((a, b) => b.over - a.over);

            // Find the goal with least progress
            const leastProgressGoal = goals
              .filter(g => !getGoalProgress(g, transactions) || getGoalProgress(g, transactions) < g.targetValue)
              .sort((a, b) => {
                const pctA = a.targetValue > 0 ? getGoalProgress(a, transactions) / a.targetValue : 0;
                const pctB = b.targetValue > 0 ? getGoalProgress(b, transactions) / b.targetValue : 0;
                return pctA - pctB;
              })[0];

            if (overBudgets.length === 0 || !leastProgressGoal) return null;

            const topOver = overBudgets[0];
            const remainingToGoal = leastProgressGoal.targetValue - getGoalProgress(leastProgressGoal, transactions);

            return (
              <div className="bg-on-primary-fixed text-on-primary p-card-padding rounded relative overflow-hidden group">
                <div className="relative z-10 space-y-sm">
                  <h4 className="font-title text-title">Acelere seus planos</h4>
                  <p className="font-body-sm opacity-70">
                    Identificamos {formatCurrency(topOver.over)} que podem ser realocados de "{topOver.category}" para "{leastProgressGoal.name}".
                  </p>
                </div>
                <MsIcon name="bolt" size={128}
                  className="absolute -bottom-4 -right-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform text-on-primary" />
              </div>
            );
          })()}
        </div>
      </div>

      {/* ═══ Modals ═══ */}
      <GoalModal open={showGoalModal} onClose={() => { setShowGoalModal(false); setEditingGoal(null); }}
        onSave={handleSaveGoal} goal={editingGoal} />
      <DepositModal open={!!depositGoal} onClose={() => setDepositGoal(null)} onSave={handleDeposit} goal={depositGoal} />
    </div>
  );
}
