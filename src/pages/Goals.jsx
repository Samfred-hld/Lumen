import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Pencil, Target, CheckCircle2, Clock, AlertTriangle, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdaptiveModal } from '@/components/ui/adaptive-modal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, getGoalProgress, clampDateInput } from '@/lib/financeUtils';
import MsIcon from '@/components/ui/ms-icon';
import { cn } from '@/lib/utils';
import { useTransactions, useGoals } from '@/hooks/useData';

const GOAL_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'];

// ═══ Zod Validation Schema ═══
const goalSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(60, 'Nome muito longo'),
  targetValue: z.number({ invalid_type_error: 'Informe um valor numérico' })
    .positive('O valor alvo deve ser maior que zero'),
  currentValue: z.number({ invalid_type_error: 'Informe um valor numérico' })
    .min(0, 'O valor atual não pode ser negativo')
    .optional(),
  deadline: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
    .optional()
    .or(z.literal('')),
  icon: z.string().optional(),
});

function GoalModal({ open, onClose, onSave, goal }) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      targetValue: undefined,
      currentValue: undefined,
      deadline: '',
      icon: '',
    },
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
        icon: goal.icon || '',
      });
      setColor(goal.color || '#10b981');
      setProgressMode(goal.progressMode || 'linked');
    } else {
      reset({
        name: '',
        targetValue: undefined,
        currentValue: undefined,
        deadline: '',
        icon: '',
      });
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
    <AdaptiveModal
      open={open}
      onOpenChange={onClose}
      title={goal ? 'Editar Meta' : 'Nova Meta'}
    >
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Label>Nome da Meta</Label>
            <Input
              {...register('name')}
              className="mt-1"
              placeholder="Ex: Reserva de Emergência"
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label>Valor Alvo (R$)</Label>
              <Input
                {...register('targetValue', { valueAsNumber: true })}
                type="number"
                min="0"
                step="0.01"
                className="mt-1"
                placeholder="0,00"
              />
              {errors.targetValue && <p className="text-sm text-destructive mt-1">{errors.targetValue.message}</p>}
            </div>
            <div>
              <Label>Como registrar progresso</Label>
              <div className="flex gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setProgressMode('linked')}
                  className={cn("flex-1 text-xs py-1.5 px-2 rounded border transition-colors",
                    progressMode === 'linked'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:bg-muted'
                  )}
                >
                  Vincular transações
                </button>
                <button
                  type="button"
                  onClick={() => setProgressMode('manual')}
                  className={cn("flex-1 text-xs py-1.5 px-2 rounded border transition-colors",
                    progressMode === 'manual'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:bg-muted'
                  )}
                >
                  Valor manual
                </button>
              </div>
            </div>
          </div>
          {progressMode === 'manual' && (
            <div>
              <Label>Valor Atual (R$)</Label>
              <Input
                {...register('currentValue', { valueAsNumber: true })}
                type="number"
                min="0"
                step="0.01"
                className="mt-1"
                placeholder="0,00"
              />
              {errors.currentValue && <p className="text-sm text-destructive mt-1">{errors.currentValue.message}</p>}
            </div>
          )}
          <div>
            <Label>Prazo</Label>
            <Input
              {...register('deadline')}
              type="date"
              max="2099-12-31"
              min="1900-01-01"
              onChange={(e) => register('deadline').onChange({ target: { value: clampDateInput(e.target.value), name: 'deadline' } })}
              onBlur={(e) => {
                const clamped = clampDateInput(e.target.value);
                if (clamped !== e.target.value) register('deadline').onChange({ target: { value: clamped, name: 'deadline' } });
              }}
              className="mt-1"
            />
            {errors.deadline && <p className="text-sm text-destructive mt-1">{errors.deadline.message}</p>}
          </div>
          <div>
            <Label>Descrição</Label>
            <Input
              {...register('icon')}
              className="mt-1"
              placeholder="Opcional..."
            />
          </div>
          <div>
            <Label>Cor</Label>
            <div className="flex gap-2 mt-1">
              {GOAL_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn("w-6 h-6 rounded-full transition-transform", color === c && "ring-2 ring-offset-2 ring-ring scale-110")}
                  style={{ background: c }}
                  aria-label={`Selecionar cor ${c}`}
                />
              ))}
            </div>
          </div>
        </form>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSubmit(onSubmit)}>{goal ? 'Salvar' : 'Criar'}</Button>
        </div>
    </AdaptiveModal>
  );
}

function calcMonthsToGoal(goal) {
  const remaining = (goal.targetValue || 0) - (goal.currentValue || 0);
  if (remaining <= 0) return null;
  const avgMonthly = goal.targetValue / 12;
  return Math.ceil(remaining / avgMonthly);
}

function GoalCard({ goal, transactions, onEdit, onDelete, onDeposit, onHistory }) {
  const current = getGoalProgress(goal, transactions);
  const pct = Math.min(100, goal.targetValue > 0 ? (current / goal.targetValue) * 100 : 0);
  const done = pct >= 100;
  const today = new Date().toISOString().split('T')[0];
  const overdue = goal.deadline && goal.deadline < today && !done;
  const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / 86400000) : null;

  return (
    <Card className="border-0 shadow-card hover:shadow-card-hover transition-shadow duration-300 overflow-hidden group">
      <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${goal.color || '#10b981'}, ${goal.color || '#10b981'}88)` }} />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{goal.name}</h3>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 shrink-0">
                {(goal.progressMode || 'linked') === 'manual' ? 'manual' : 'automático'}
              </Badge>
              {done && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
              {overdue && !done && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
            </div>
            {goal.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{goal.description}</p>}
          </div>
          <div className="flex gap-1 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(goal)} className="p-1.5 hover:bg-muted rounded text-muted-foreground" aria-label="Editar meta"><Pencil size={12} /></button>
            <button onClick={() => onDelete(goal.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400" aria-label="Excluir meta"><Trash2 size={12} /></button>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-bold tabular-nums" style={{ color: goal.color }}>{formatCurrency(current)}</span>
            <span className="text-muted-foreground tabular-nums">{formatCurrency(goal.targetValue)}</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden progress-animated">
            <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${goal.color || '#10b981'}, ${goal.color || '#10b981'}cc)` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs font-bold" style={{ color: goal.color }}>{pct.toFixed(1)}%</span>
            {daysLeft !== null && (
              <span className={cn("text-xs flex items-center gap-1 font-medium", overdue ? 'text-red-500' : 'text-muted-foreground')}>
                <Clock size={10} />
                {done ? 'Concluída' : overdue ? `Atrasada ${Math.abs(daysLeft)}d` : `${daysLeft}d restantes`}
              </span>
            )}
          </div>
          {!done && (() => {
            const months = calcMonthsToGoal(goal);
            if (!months) return null;
            return (
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                <MsIcon name="trending_up" size={14} className="align-middle mr-1" />Projecao: ~{months} mes(es) para concluir
              </p>
            );
          })()}
        </div>

        {!done && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDeposit(goal)}
              title="Registra manualmente o valor alocado para esta meta. Nao movimenta sua conta automaticamente."
              className="flex-1 text-xs h-8 rounded hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Plus size={12} className="mr-1" /> Registrar progresso
            </Button>
            <Button size="sm" variant="outline" className="h-8 rounded text-xs" onClick={() => onHistory(goal)}>
              <History size={12} />
            </Button>
          </div>
        )}
        {done && (
          <Button size="sm" variant="outline" className="w-full text-xs h-8 rounded" onClick={() => onHistory(goal)}>
            <History size={12} className="mr-1" /> Histórico
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function DepositModal({ open, onClose, onSave, goal }) {
  const [value, setValue] = useState('');
  return (
    <AdaptiveModal
      open={open}
      onOpenChange={onClose}
      title={`Registrar progresso em "${goal?.name}"`}
      className="max-w-xs"
    >
        <div>
          <Label>Valor (R$)</Label>
          <Input type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)} className="mt-1" placeholder="0,00" />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={() => { onSave(parseFloat(value)); setValue(''); }}>Registrar</Button>
        </div>
    </AdaptiveModal>
  );
}

// ═══ Investment History Modal (BACKLOG-13) ═══
function InvestmentHistoryModal({ open, onClose, goal, transactions }) {
  if (!goal) return null;

  const goalTx = (transactions || [])
    .filter(t => t.goalId === goal.id)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const totalIn = goalTx.filter(t => t.type === 'income').reduce((s, t) => s + (t.value || 0), 0);
  const totalOut = goalTx.filter(t => t.type === 'expense' || t.type === 'investment').reduce((s, t) => s + (t.value || 0), 0);

  return (
    <AdaptiveModal
      open={open}
      onOpenChange={onClose}
      title={
        <span className="flex items-center gap-2">
          <History size={18} className="text-violet-500" /> Movimentações — {goal.name}
        </span>
      }
      className="max-w-lg"
    >

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Card className="border-0 shadow-sm"><CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Entradas</p>
            <p className="text-lg font-bold text-emerald-600 tabular-nums">{formatCurrency(totalIn)}</p>
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Saídas</p>
            <p className="text-lg font-bold text-red-500 tabular-nums">{formatCurrency(totalOut)}</p>
          </CardContent></Card>
        </div>

        {goalTx.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Sem movimentações nesta meta</div>
        ) : (
          <div className="space-y-1">
            {goalTx.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded border border-border/60 hover:bg-muted/40 transition-colors">
                <div className={cn("w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0",
                  t.type === 'income' ? 'gradient-emerald text-emerald-700' : 'gradient-red text-red-700')}>
                  {(t.description || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(t.date)} · {t.category}</p>
                </div>
                <span className={cn("text-sm font-bold tabular-nums shrink-0",
                  t.type === 'income' ? 'text-emerald-600' : 'text-red-500')}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(t.value))}
                </span>
              </div>
            ))}
          </div>
        )}
    </AdaptiveModal>
  );
}

export default function Goals() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [depositGoal, setDepositGoal] = useState(null);
  const [historyGoal, setHistoryGoal] = useState(null);

  const { data: goals = [], refetch } = useGoals();
  const { data: transactions = [], refetch: refetchTx } = useTransactions(500);

  const handleSave = async (data) => {
    if (editing) await base44.entities.Goal.update(editing.id, data);
    else await base44.entities.Goal.create(data);
    refetch();
    setShowModal(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.Goal.delete(id);
    refetch();
  };

  const handleDeposit = async (amount) => {
    const goal = depositGoal;
    const current = getGoalProgress(goal, transactions);
    await base44.entities.Goal.update(goal.id, { currentValue: current + amount });
    refetch();
    setDepositGoal(null);
  };

  const totalTarget = goals.reduce((s, g) => s + (g.targetValue || 0), 0);
  const totalCurrent = goals.reduce((s, g) => s + getGoalProgress(g, transactions), 0);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Metas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Acompanhe seus objetivos financeiros</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>
          <Plus size={14} className="mr-1" /> Nova Meta
        </Button>
      </div>

      {goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Acumulado</p><p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(totalCurrent)}</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total de Metas</p><p className="text-xl font-bold mt-1">{formatCurrency(totalTarget)}</p></CardContent></Card>
        </div>
      )}

      {goals.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-10 text-center">
            <Target size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma meta cadastrada</p>
            <Button size="sm" className="mt-3" onClick={() => setShowModal(true)}>Criar primeira meta</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              transactions={transactions}
              onEdit={g => { setEditing(g); setShowModal(true); }}
              onDelete={handleDelete}
              onDeposit={g => setDepositGoal(g)}
              onHistory={g => setHistoryGoal(g)}
            />
          ))}
        </div>
      )}

      <GoalModal open={showModal} onClose={() => { setShowModal(false); setEditing(null); }} onSave={handleSave} goal={editing} />
      <DepositModal open={!!depositGoal} onClose={() => setDepositGoal(null)} onSave={handleDeposit} goal={depositGoal} />
      <InvestmentHistoryModal open={!!historyGoal} onClose={() => setHistoryGoal(null)} goal={historyGoal} transactions={transactions} />
    </div>
  );
}