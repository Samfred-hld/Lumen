import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/api/supabaseClient';
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight, TrendingUp, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdaptiveModal } from '@/components/ui/adaptive-modal';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, filterByMonth, getMonthKey } from '@/lib/financeUtils';
import { DEFAULT_CATEGORIES, MONTH_NAMES, CAT_COLORS } from '@/lib/categories';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useMonthNavigation } from '@/hooks/useMonthNavigation';
import { useBudgets, useTransactions } from '@/hooks/useData';

// ═══ Zod Validation Schema ═══
const budgetSchema = z.object({
  category: z.string().min(1, 'Selecione uma categoria'),
  limit: z.number({ invalid_type_error: 'Informe um valor numérico' })
    .positive('O limite deve ser maior que zero'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Mês inválido'),
  isRecurring: z.boolean().optional(),
});

function BudgetModal({ open, onClose, onSave, budget, monthKey }) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category: '',
      limit: undefined,
      month: monthKey,
      isRecurring: false,
    },
  });

  React.useEffect(() => {
    if (budget) {
      reset({
        category: budget.category,
        limit: budget.limit,
        month: budget.month,
        isRecurring: budget.isRecurring || false,
      });
    } else {
      reset({
        category: '',
        limit: undefined,
        month: monthKey,
        isRecurring: false,
      });
    }
  }, [budget, open, monthKey, reset]);

  const onSubmit = (data) => {
    onSave({ ...data, limit: data.limit, isRecurring: data.isRecurring || false });
  };

  return (
    <AdaptiveModal
      open={open}
      onOpenChange={onClose}
      title={budget ? 'Editar Orçamento' : 'Novo Orçamento'}
    >
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Label>Categoria</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{DEFAULT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              )}
            />
            {errors.category && <p className="text-sm text-destructive mt-1">{errors.category.message}</p>}
          </div>
          <div>
            <Label>Limite (R$)</Label>
            <Input
              {...register('limit', { valueAsNumber: true })}
              type="number"
              min="0"
              step="0.01"
              className="mt-1"
              placeholder="0,00"
            />
            {errors.limit && <p className="text-sm text-destructive mt-1">{errors.limit.message}</p>}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Controller
              name="isRecurring"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isRecurring"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="isRecurring" className="cursor-pointer font-normal text-sm flex items-center gap-1.5">
              <Repeat size={12} /> Repetir todo mês
            </Label>
          </div>
        </form>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSubmit(onSubmit)}>
            {budget ? 'Salvar' : 'Criar'}
          </Button>
        </div>
    </AdaptiveModal>
  );
}

export default function Budgets() {
  const { month: currentMonth, year: currentYear, navigate } = useMonthNavigation();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineValue, setInlineValue] = useState('');

  const monthKey = getMonthKey(currentYear, currentMonth);

  const { data: budgets = [], refetch } = useBudgets();
  const { data: transactions = [] } = useTransactions();

  const monthBudgets = budgets.filter(b => b.month === monthKey);
  const monthTx = filterByMonth(transactions, currentYear, currentMonth);

  const handleSave = async (data) => {
    const payload = { ...data, month: monthKey };
    if (editing) await supabase.from('budgets').update(payload).eq('id', editing.id);
    else await supabase.from('budgets').insert(payload).select().single();
    refetch();
    setShowModal(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    await supabase.from('budgets').delete().eq('id', id);
    refetch();
  };

  const handleInlineSave = async (budget) => {
    const val = parseFloat(inlineValue);
    if (!isNaN(val) && val > 0) {
      await supabase.from('budgets').update({ limit: val }).eq('id', budget.id);
      refetch();
    }
    setInlineEditId(null);
    setInlineValue('');
  };

  const totalLimit = monthBudgets.reduce((s, b) => s + (b.limit || 0), 0);
  const totalSpent = monthBudgets.reduce((s, b) => {
    const spent = monthTx.filter(t => t.type === 'expense' && t.category === b.category).reduce((a, t) => a + t.value, 0);
    return s + spent;
  }, 0);

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Controle de gastos por categoria</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-card border rounded px-2 py-1">
            <button onClick={() => navigate(-1)} className="p-1 hover:bg-muted rounded" aria-label="Mês anterior"><ChevronLeft size={14} /></button>
            <span className="text-sm font-medium px-2 min-w-[110px] text-center">{MONTH_NAMES[currentMonth]} {currentYear}</span>
            <button onClick={() => navigate(1)} className="p-1 hover:bg-muted rounded" aria-label="Próximo mês"><ChevronRight size={14} /></button>
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={14} className="mr-1" /> Novo
          </Button>
        </div>
      </div>

      {/* Summary */}
      {monthBudgets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
          <Card className="border-0 shadow-card gradient-blue"><CardContent className="p-4"><p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Orçamento Total</p><p className="text-xl font-bold mt-1 tabular-nums">{formatCurrency(totalLimit)}</p></CardContent></Card>
          <Card className="border-0 shadow-card gradient-red"><CardContent className="p-4"><p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Gasto</p><p className="text-xl font-bold mt-1 text-red-500 tabular-nums">{formatCurrency(totalSpent)}</p></CardContent></Card>
          <Card className="border-0 shadow-card gradient-emerald"><CardContent className="p-4"><p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Disponível</p><p className={cn("text-xl font-bold mt-1 tabular-nums", totalLimit - totalSpent >= 0 ? 'text-emerald-600' : 'text-red-500')}>{formatCurrency(totalLimit - totalSpent)}</p></CardContent></Card>
        </div>
      )}

      {/* Budget cards */}
      {monthBudgets.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-10 text-center">
            <TrendingUp size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum orçamento para este mês</p>
            <Button size="sm" className="mt-3" onClick={() => setShowModal(true)}>Criar primeiro orçamento</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {monthBudgets.map(b => {
            const spent = monthTx
              .filter(t => t.type === 'expense' && t.category === b.category)
              .reduce((s, t) => s + t.value, 0);
            const pct = b.limit > 0 ? Math.min(100, (spent / b.limit) * 100) : 0;
            const over = spent > b.limit;
            const warn = pct > 80;
            const color = CAT_COLORS[b.category] || '#94a3b8';

            return (
              <Card key={b.id} className="border-0 shadow-card hover:shadow-card-hover transition-shadow duration-300 overflow-hidden">
                <div className="h-1" style={{ background: color }} />
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: color }} />
                      <span className="font-semibold text-sm">{b.category}</span>
                      {b.isRecurring && <Repeat size={11} className="text-muted-foreground shrink-0" />}
                    </div>
                    <div className="flex gap-1 opacity-60 hover:opacity-100 transition-opacity">
                      <button onClick={() => { setInlineEditId(b.id); setInlineValue(String(b.limit)); }} className="p-1.5 hover:bg-muted rounded" aria-label="Editar limite"><Pencil size={12} /></button>
                      <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded" aria-label="Excluir orçamento"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className={cn("font-bold tabular-nums", over ? 'text-red-500' : warn ? 'text-amber-600' : 'text-foreground')}>
                      {formatCurrency(spent)}
                    </span>
                    {inlineEditId === b.id ? (
                      <Input
                        type="number"
                        value={inlineValue}
                        onChange={e => setInlineValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleInlineSave(b); if (e.key === 'Escape') { setInlineEditId(null); setInlineValue(''); } }}
                        onBlur={() => handleInlineSave(b)}
                        className="h-6 w-24 text-right text-sm font-semibold tabular-nums px-1"
                        autoFocus
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      <span
                        className="text-muted-foreground tabular-nums cursor-pointer hover:text-foreground transition-colors"
                        onDoubleClick={() => { setInlineEditId(b.id); setInlineValue(String(b.limit)); }}
                        title="Duplo-clique para editar"
                      >
                        {formatCurrency(b.limit)}
                      </span>
                    )}
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden progress-animated">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700 ease-out", over ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-emerald-500')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className={cn("text-xs font-semibold", over ? 'text-red-500' : warn ? 'text-amber-600' : 'text-muted-foreground')}>
                      {over ? `Excedeu ${formatCurrency(spent - b.limit)}` : `${pct.toFixed(0)}% usado`}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Restam {formatCurrency(Math.max(0, b.limit - spent))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSave={handleSave}
        budget={editing}
        monthKey={monthKey}
      />
    </div>
  );
}