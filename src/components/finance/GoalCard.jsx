import React from 'react';
import MsIcon from '@/components/ui/ms-icon';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/financeUtils';
import { cn } from '@/lib/utils';

/**
 * GoalCard — Presentational goal card with circular progress and design tokens.
 * Extracted from Goals.jsx/Planejamento.jsx for reuse.
 *
 * Props:
 * - goal: { id, name, targetValue, currentValue, deadline, color, description, progressMode }
 * - currentProgress: number (calculated from getGoalProgress)
 * - onEdit: (goal) => void
 * - onDelete: (goalId) => void
 * - onDeposit: (goal) => void
 * - onHistory: (goal) => void
 */
export default function GoalCard({ goal, currentProgress, onEdit, onDelete, onDeposit, onHistory }) {
  const pct = goal.targetValue > 0 ? Math.min(100, (currentProgress / goal.targetValue) * 100) : 0;
  const done = pct >= 100;
  const today = new Date().toISOString().split('T')[0];
  const overdue = goal.deadline && goal.deadline < today && !done;
  const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / 86400000) : null;
  const strokeColor = goal.color || '#10b981';
  const circumference = 2 * Math.PI * 20; // r=20
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="bg-surface-container-low border border-surface-border p-card-padding space-y-lg group">
      {/* Header with circular progress */}
      <div className="flex justify-between items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-sm">
            <p className="font-title text-title truncate">{goal.name}</p>
            {done && <MsIcon name="check_circle" size={14} className="text-success shrink-0" />}
            {overdue && !done && <MsIcon name="warning" size={14} className="text-danger shrink-0" />}
          </div>
          {goal.description && <p className="font-body-sm text-on-surface-variant mt-xs truncate">{goal.description}</p>}
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
          <p className="font-mono-number text-title tabular-nums">{formatCurrency(currentProgress)}</p>
        </div>
        <div>
          <p className="font-label-caps text-[10px] text-muted-foreground">OBJETIVO</p>
          <p className="font-mono-number text-title tabular-nums">{formatCurrency(goal.targetValue)}</p>
        </div>
      </div>

      {/* Days left / overdue */}
      {daysLeft !== null && (
        <div className="flex items-center gap-xs font-body-sm text-on-surface-variant">
          <MsIcon name="event" size={14} />
          <span>
            {done ? 'Concluída' : overdue ? `Atrasada ${Math.abs(daysLeft)}d` : `${daysLeft}d restantes`}
          </span>
        </div>
      )}

      {/* Forecast section */}
      {goal.deadline && !done && (
        <div className="bg-primary-light/10 p-sm rounded-sm">
          <p className="font-body-sm text-primary flex items-center gap-xs">
            <MsIcon name="event" size={14} />
            Previsão: {new Date(goal.deadline + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-sm">
        {!done && (
          <Button size="sm" variant="outline" onClick={() => onDeposit(goal)}
            className="flex-1 text-xs h-8 rounded hover:bg-primary hover:text-primary-foreground transition-colors">
            <MsIcon name="add" size={12} className="mr-1" /> Registrar
          </Button>
        )}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(goal)}
            className="p-1.5 hover:bg-surface-container rounded text-muted-foreground" aria-label="Editar">
            <MsIcon name="edit" size={12} />
          </button>
          <button onClick={() => onDelete(goal.id)}
            className="p-1.5 hover:bg-red-50 rounded text-red-400" aria-label="Excluir">
            <MsIcon name="delete" size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
